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

// Classify a single 21-landmark hand into one of our MVP signs.
// Heuristic: count extended fingers (tip above pip in image-y, smaller y = up).
function classify(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const tips = [4, 8, 12, 16, 20];
  const pips = [2, 6, 10, 14, 18];
  const extended = tips.map((tip, i) => {
    if (i === 0) {
      // thumb: compare x
      return Math.abs(landmarks[tip].x - landmarks[0].x) > Math.abs(landmarks[pips[i]].x - landmarks[0].x) + 0.03;
    }
    return landmarks[tip].y < landmarks[pips[i]].y - 0.02;
  });
  const [thumb, index, middle, ring, pinky] = extended;
  const count = extended.filter(Boolean).length;

  // mapping rules → sign keys
  if (thumb && index && !middle && !ring && pinky) return { key: "i_love_you", confidence: 0.92 };
  if (count === 5) return { key: "hello", confidence: 0.9 };
  if (!thumb && index && middle && !ring && !pinky) return { key: "yes", confidence: 0.84 };
  if (thumb && !index && !middle && !ring && !pinky) return { key: "yes", confidence: 0.8 };
  if (!thumb && !index && !middle && !ring && !pinky) return { key: "no", confidence: 0.82 };
  if (thumb && !index && !middle && !ring && pinky) return { key: "help", confidence: 0.86 };
  if (!thumb && index && !middle && !ring && !pinky) return { key: "stop", confidence: 0.78 };
  if (count === 4 && !thumb) return { key: "stop", confidence: 0.83 };
  if (thumb && index && middle && !ring && !pinky) return { key: "water", confidence: 0.81 };
  if (index && middle && ring && !pinky && !thumb) return { key: "thank_you", confidence: 0.8 };
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

        // Two-hand specific signs (e.g., overlapping flat palms)
        let cls = null;
        if (lmList.length === 2) {
          // Distance between wrists (landmark 0)
          const w0 = lmList[0][0];
          const w1 = lmList[1][0];
          const dist = Math.hypot(w0.x - w1.x, w0.y - w1.y);
          if (dist < 0.18) {
            cls = { key: "stop", confidence: 0.9 }; // both hands close together = stop
          } else if (dist < 0.35) {
            // both hands in frame, slightly apart → "thank you"-like gesture
            cls = { key: "thank_you", confidence: 0.85 };
          }
        }
        // Fall back to per-hand classification, pick highest confidence
        if (!cls) {
          const candidates = lmList.map((h) => classify(h)).filter(Boolean);
          if (candidates.length) {
            candidates.sort((a, b) => b.confidence - a.confidence);
            cls = { ...candidates[0], hands: lmList.length };
          }
        }

        setDetection(cls);
        const now = Date.now();
        if (cls && (cls.key !== lastEmitRef.current.key || now - lastEmitRef.current.at > 1800)) {
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
