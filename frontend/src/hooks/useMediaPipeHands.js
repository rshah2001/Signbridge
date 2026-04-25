import { useCallback, useEffect, useRef, useState } from "react";

const SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });
}

// Detect which fingers are extended for one hand.
// Returns object {thumb, index, middle, ring, pinky, count, openness}.
function fingerState(lm) {
  if (!lm || lm.length < 21) return null;
  // y in image coords: smaller y = higher (extended for non-thumbs)
  const tipPip = [
    [4, 2],   // thumb tip vs MCP base — handled by x distance
    [8, 6],   // index
    [12, 10], // middle
    [16, 14], // ring
    [20, 18], // pinky
  ];
  const wrist = lm[0];
  // For thumb, compare horizontal distance (mirrored video doesn't matter — same hand frame)
  const thumb = Math.hypot(lm[4].x - wrist.x, lm[4].y - wrist.y) >
                Math.hypot(lm[2].x - wrist.x, lm[2].y - wrist.y) + 0.03 &&
                Math.abs(lm[4].x - lm[3].x) > 0.04;
  const ext = [thumb];
  for (let i = 1; i < 5; i++) {
    const [tip, pip] = tipPip[i];
    ext.push(lm[tip].y < lm[pip].y - 0.025);
  }
  const [t, idx, mid, rng, pky] = ext;
  return {
    thumb: t, index: idx, middle: mid, ring: rng, pinky: pky,
    count: ext.filter(Boolean).length,
    palmY: lm[0].y,
    openness: Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y), // thumb-index distance
  };
}

// Single-hand classification (returns {key, confidence} or null).
function classify(lm) {
  const s = fingerState(lm);
  if (!s) return null;
  const { thumb, index, middle, ring, pinky, count, openness } = s;

  // ILY: thumb + index + pinky extended; middle + ring closed
  if (thumb && index && !middle && !ring && pinky) return { key: "i_love_you", confidence: 0.94 };

  // Open palm (5 fingers) → Hello (greeting wave)
  if (count === 5) return { key: "hello", confidence: 0.9 };

  // V-hand (index + middle, others closed) → Yes/peace
  if (!thumb && index && middle && !ring && !pinky) return { key: "yes", confidence: 0.88 };

  // W-hand (index + middle + ring, no thumb/pinky) → Water
  if (!thumb && index && middle && ring && !pinky) return { key: "water", confidence: 0.86 };

  // Y-hand (thumb + pinky only) → Hungry (or "call me" handshape)
  if (thumb && !index && !middle && !ring && pinky) return { key: "hungry", confidence: 0.82 };

  // Index only → Stop (pointed warning) or "wait" — map to Stop
  if (!thumb && index && !middle && !ring && !pinky) return { key: "stop", confidence: 0.8 };

  // 4 fingers no thumb (B-hand flat palm sideways) → Stop (B-hand)
  if (!thumb && index && middle && ring && pinky) return { key: "stop", confidence: 0.85 };

  // Thumbs up (only thumb extended) → Yes
  if (thumb && !index && !middle && !ring && !pinky) return { key: "yes", confidence: 0.83 };

  // Closed fist (no fingers extended at all) → Sorry (A-hand on chest)
  if (count === 0) return { key: "sorry", confidence: 0.78 };

  // Pinch (thumb + index, openness small) → No
  if (thumb && index && !middle && !ring && !pinky) {
    if (openness < 0.07) return { key: "no", confidence: 0.84 };
    return { key: "no", confidence: 0.76 };
  }

  // Three forward fingers (thumb + index + middle) → Thank you / promise
  if (thumb && index && middle && !ring && !pinky) return { key: "thank_you", confidence: 0.8 };

  // Pinky-only → Pain (pinky finger pointing)
  if (!thumb && !index && !middle && !ring && pinky) return { key: "pain", confidence: 0.74 };

  return null;
}

export function useMediaPipeHands({ onSign } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastEmitRef = useRef({ key: null, at: 0 });
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [detection, setDetection] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        for (const src of SCRIPTS) await loadScript(src);
        if (cancelled) return;
        setReady(true);
      } catch (e) {
        setError("Failed to load MediaPipe");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const start = useCallback(async () => {
    if (!ready || !videoRef.current) return;
    setError(null);
    try {
      const Hands = window.Hands;
      const Camera = window.Camera;
      const drawConnectors = window.drawConnectors;
      const drawLandmarks = window.drawLandmarks;
      const HAND_CONNECTIONS = window.HAND_CONNECTIONS;

      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((results) => {
        const canvas = canvasRef.current;
        const lmList = results.multiHandLandmarks || [];
        if (canvas) {
          const ctx = canvas.getContext("2d");
          canvas.width = results.image.width;
          canvas.height = results.image.height;
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw each detected hand (up to 2)
          lmList.forEach((lm, idx) => {
            const color = idx === 0 ? "#2E5A44" : "#B34D41";
            drawConnectors(ctx, lm, HAND_CONNECTIONS, { color, lineWidth: 3 });
            drawLandmarks(ctx, lm, { color: idx === 0 ? "#B34D41" : "#2E5A44", lineWidth: 1, radius: 3 });
          });
          ctx.restore();
        }

        if (lmList.length === 0) {
          setDetection(null);
          return;
        }

        // Two-hand specific signs use ASL-aware heuristics
        let cls = null;
        if (lmList.length === 2) {
          const a = lmList[0];
          const b = lmList[1];
          const sa = fingerState(a);
          const sb = fingerState(b);
          // wrist distance
          const w0 = a[0], w1 = b[0];
          const wristDist = Math.hypot(w0.x - w1.x, w0.y - w1.y);
          // index-tip distance (8-8) and palm centers
          const palmDist = Math.hypot(a[9].x - b[9].x, a[9].y - b[9].y);

          // Both fists very close → Stop (crossed fists)
          if (sa && sb && sa.count <= 1 && sb.count <= 1 && wristDist < 0.16) {
            cls = { key: "stop", confidence: 0.92 };
          }
          // Two open palms close together (prayer / please)
          else if (sa && sb && sa.count >= 4 && sb.count >= 4 && palmDist < 0.18) {
            cls = { key: "please", confidence: 0.9 };
          }
          // Both ILY-handshapes → strong I love you
          else if (sa && sb && sa.thumb && sa.index && sa.pinky && !sa.middle && !sa.ring &&
                   sb.thumb && sb.index && sb.pinky && !sb.middle && !sb.ring) {
            cls = { key: "i_love_you", confidence: 0.96 };
          }
          // Two flat palms moving from chin outward → Thank you (palms open, both visible)
          else if (sa && sb && sa.count >= 4 && sb.count >= 4 && palmDist > 0.25 && palmDist < 0.55) {
            cls = { key: "thank_you", confidence: 0.86 };
          }
          // Closed fist on flat palm (Help): one fist + one open palm close
          else if (sa && sb &&
                   ((sa.count <= 1 && sb.count >= 4) || (sb.count <= 1 && sa.count >= 4)) &&
                   palmDist < 0.22) {
            cls = { key: "help", confidence: 0.9 };
          }
          // Both fists circling on chest → Sorry (A-hand)
          else if (sa && sb && sa.count === 0 && sb.count === 0 && wristDist > 0.12 && wristDist < 0.4) {
            cls = { key: "sorry", confidence: 0.84 };
          }
          // Index fingers pointing toward each other near torso → Pain
          else if (sa && sb && sa.count === 1 && sb.count === 1 && sa.index && sb.index && palmDist < 0.2) {
            cls = { key: "pain", confidence: 0.86 };
          }
        }
        // Fall back to per-hand classification, pick highest confidence
        if (!cls) {
          const candidates = lmList.map((h) => classify(h)).filter(Boolean);
          if (candidates.length) {
            candidates.sort((a, b) => b.confidence - a.confidence);
            cls = { ...candidates[0], hands: lmList.length };
          }
        } else {
          cls.hands = 2;
        }

        setDetection(cls);
        const now = Date.now();
        // 2-second dedupe window for the same gesture
        if (cls && (cls.key !== lastEmitRef.current.key || now - lastEmitRef.current.at > 2000)) {
          lastEmitRef.current = { key: cls.key, at: now };
          onSign && onSign(cls);
        }
      });
      handsRef.current = hands;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      cameraRef.current = camera;
      await camera.start();
      setRunning(true);
    } catch (e) {
      setError(e.message || "camera error");
      setRunning(false);
    }
  }, [ready, onSign]);

  const stop = useCallback(() => {
    try { cameraRef.current?.stop?.(); } catch { /* noop */ }
    try {
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch { /* noop */ }
    cameraRef.current = null;
    handsRef.current = null;
    setRunning(false);
  }, []);

  return { videoRef, canvasRef, ready, running, detection, error, start, stop };
}
