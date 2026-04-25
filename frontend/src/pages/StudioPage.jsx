import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Mic, MicOff, Send, Volume2, Camera, CameraOff, Loader2, MessageSquare, Sparkles, Hand, ShieldAlert, Pause, Play, RotateCcw, ChevronRight } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  addMessage, createConversation, getConversation, getPhrases,
  logSignDetection, signToVoice, speakTTS, voiceToSign,
} from "../lib/api";
import { SignCard } from "../components/SignCard";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useMediaPipeHands } from "../hooks/useMediaPipeHands";
import { iconFor } from "../lib/signIcons";
import { buildPlaybackSequence } from "../lib/signPlayback";
import { useAppHealth } from "../context/AppHealthContext";

const VIDEO_NAME_OVERRIDES = {
  do_not: "Do Not",
  does_not: "Does Not",
  thank_you: "Thank You",
  me: "ME",
};

const titleCase = (value) => value
  .split(" ")
  .filter(Boolean)
  .map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1).toLowerCase()))
  .join(" ");

const candidateVideoUrls = (phraseLike) => {
  if (!phraseLike) return [];
  const candidates = [];
  const pushCandidate = (value) => {
    if (!value) return;
    const normalized = `${value}`.trim();
    if (!normalized) return;
    candidates.push(`/sign-videos/${encodeURIComponent(normalized)}.mp4`);
  };

  pushCandidate(phraseLike.video_asset);
  if (phraseLike.video_path) {
    candidates.push(phraseLike.video_path);
  }

  const key = phraseLike.key || "";
  const label = phraseLike.label || key.replace(/_/g, " ");
  pushCandidate(VIDEO_NAME_OVERRIDES[key]);
  pushCandidate(label);
  pushCandidate(titleCase(label.replace(/_/g, " ")));
  pushCandidate(titleCase(key.replace(/_/g, " ")));
  if (key.length === 1) pushCandidate(key.toUpperCase());

  return [...new Set(candidates)];
};

const SignClip = ({ phrase, className = "", autoPlay = true }) => {
  const urls = useMemo(() => candidateVideoUrls(phrase), [phrase]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [urls]);

  if (!urls.length || index >= urls.length) return null;

  return (
    <video
      key={urls[index]}
      className={className}
      src={urls[index]}
      autoPlay={autoPlay}
      loop={autoPlay}
      muted
      playsInline
      controls={!autoPlay}
      onError={() => setIndex((current) => current + 1)}
    />
  );
};

const playbackItemForToken = (token, phraseMap) => phraseMap[token] || {
  key: token,
  label: token.replace(/_/g, " "),
  icon: "MessageSquare",
  description: "Finger-spelled fallback",
};

/* ---------------- Sign output center: sequential clip playback ------------- */
const SignReveal = ({ tokens, phrases, simplified, sourceText }) => {
  const phraseMap = useMemo(() => Object.fromEntries(phrases.map((p) => [p.key, p])), [phrases]);
  const playbackItems = useMemo(
    () => {
      const byAsset = buildPlaybackSequence(sourceText || simplified);
      if (byAsset.length) return byAsset;
      return tokens.map((token) => playbackItemForToken(token, phraseMap));
    },
    [phraseMap, simplified, sourceText, tokens],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);
  const currentItem = playbackItems[currentIndex] || null;
  const currentUrls = useMemo(() => {
    if (currentItem?.videoPath) return [currentItem.videoPath];
    return candidateVideoUrls(currentItem);
  }, [currentItem]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const activeVideoUrl = currentUrls[currentUrlIndex] || null;

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [tokens, simplified]);

  useEffect(() => {
    setCurrentUrlIndex(0);
  }, [currentItem]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      const playback = video.play?.();
      if (playback && typeof playback.catch === "function") {
        playback.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [activeVideoUrl, currentIndex, isPlaying]);

  const advance = useCallback(() => {
    setCurrentIndex((index) => {
      if (index >= playbackItems.length - 1) {
        setIsPlaying(false);
        return index;
      }
      return index + 1;
    });
  }, [playbackItems.length]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setCurrentUrlIndex(0);
    setIsPlaying(true);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
        <Sparkles strokeWidth={1.5} className="h-4 w-4 text-[#2E5A44]" /> Sign output
      </div>
      {playbackItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Hand strokeWidth={1.2} className="h-16 w-16 text-[#DCD5C9]" />
          <p className="mt-4 max-w-[26ch] text-sm text-[#5C6B62]">
            Speak on the left — Gemini will simplify and signs will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[#DCD5C9] bg-[#F7F5F0] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#5C6B62]">Simplified by Gemini</div>
            <div className="mt-2 font-display text-xl leading-snug">{simplified}</div>
          </div>
          <div className="mt-4 flex flex-1 flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-[#DCD5C9] bg-[#F3E8C8]">
              {activeVideoUrl ? (
                <video
                  key={`${currentItem?.key || "empty"}-${currentUrlIndex}`}
                  ref={videoRef}
                  className="h-[320px] w-full object-cover"
                  src={activeVideoUrl}
                  playsInline
                  muted
                  autoPlay={isPlaying}
                  controls
                  onEnded={advance}
                  onError={() => {
                    if (currentUrlIndex < currentUrls.length - 1) {
                      setCurrentUrlIndex((index) => index + 1);
                    } else {
                      advance();
                    }
                  }}
                  data-testid={`sign-output-${currentItem?.key || "sequence"}`}
                />
              ) : (
                <div className="flex h-[320px] flex-col items-center justify-center bg-[#F7F5F0] px-6 text-center">
                  <Hand className="h-12 w-12 text-[#B9B0A2]" />
                  <p className="mt-3 text-sm text-[#5C6B62]">
                    No exact clip for <span className="font-medium text-[#1F2421]">{currentItem?.label}</span>. Moving to the next sign.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full bg-[#2E5A44] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244a37]"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause sequence" : "Play sequence"}
              </button>
              <button
                type="button"
                onClick={restart}
                className="inline-flex items-center gap-2 rounded-full border border-[#DCD5C9] bg-white px-4 py-2 text-sm font-medium text-[#1F2421] transition-colors hover:border-[#2E5A44] hover:text-[#2E5A44]"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
              <div className="rounded-full bg-[#F7F5F0] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[#5C6B62]">
                Step {Math.min(currentIndex + 1, playbackItems.length)} of {playbackItems.length}
              </div>
            </div>
            <div className="grid gap-2 overflow-auto pr-1 sm:grid-cols-2">
              {playbackItems.map((item, index) => {
                const Icon = iconFor(item.icon);
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;
                return (
                  <div
                    key={`${item.key}-${index}`}
                    className={`rounded-xl border p-3 transition-all ${
                      isActive
                        ? "border-[#2E5A44] bg-[#2E5A44] text-white"
                        : isCompleted
                          ? "border-[#CFC7B8] bg-[#F7F5F0] text-[#5C6B62]"
                          : "border-[#DCD5C9] bg-white text-[#1F2421]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isActive ? "bg-white/15" : "bg-[#EEE7D8]"}`}>
                        <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#2E5A44]"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-sm">{item.label}</div>
                        <div className={`text-[11px] ${isActive ? "text-white/75" : "text-[#5C6B62]"}`}>
                          {item.assetName ? "asset clip" : candidateVideoUrls(item).length ? "clip ready" : "letter fallback"}
                        </div>
                      </div>
                      {index < playbackItems.length - 1 && <ChevronRight className={`h-4 w-4 ${isActive ? "text-white/80" : "text-[#B9B0A2]"}`} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* -------------------------------- Studio page ------------------------------- */
export default function StudioPage() {
  const { health, error: healthError, refresh: refreshHealth } = useAppHealth();
  const [phrases, setPhrases] = useState([]);
  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);

  // voice → sign state
  const [v2sLoading, setV2sLoading] = useState(false);
  const [v2sTokens, setV2sTokens] = useState([]);
  const [v2sSimplified, setV2sSimplified] = useState("");
  const [v2sSourceText, setV2sSourceText] = useState("");
  const [textInput, setTextInput] = useState("");

  // sign → voice state
  const [pendingSigns, setPendingSigns] = useState([]); // [{key, confidence}]
  const [s2vLoading, setS2vLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const phrasesRef = useRef([]);
  const lastSpokenRef = useRef({ key: null, at: 0 });
  const emergencyKeys = useMemo(
    () => new Set(phrases.filter((p) => p.emergency).map((p) => p.key)),
    [phrases],
  );
  const emergencyPhrases = useMemo(() => phrases.filter((p) => p.emergency), [phrases]);
  const emergencyQueue = useMemo(
    () => pendingSigns.filter((item) => emergencyKeys.has(item.key)),
    [emergencyKeys, pendingSigns],
  );
  const sortedPhrases = useMemo(
    () => [...phrases].sort((a, b) =>
      Number(b.emergency) - Number(a.emergency)
      || Number(Boolean(b.video_path)) - Number(Boolean(a.video_path))
      || a.label.localeCompare(b.label)),
    [phrases],
  );
  const clipReadyCount = useMemo(
    () => phrases.filter((phrase) => Boolean(phrase.video_path)).length,
    [phrases],
  );

  const handleSpeechFinal = useCallback(async (final) => {
    if (!final) return;
    await runVoiceToSign(final);
  }, []); // eslint-disable-line

  const speech = useSpeechRecognition({ onFinal: handleSpeechFinal });

  const speakImmediate = useCallback((text) => {
    // Try ElevenLabs first; fall back to browser SpeechSynthesis instantly
    speakTTS(text)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setTimeout(() => audioRef.current?.play().catch(() => {}), 30);
      })
      .catch(() => {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.rate = 1.05;
          u.pitch = 1.0;
          window.speechSynthesis.speak(u);
        } catch { /* noop */ }
      });
  }, []);

  const handleSignDetected = useCallback((cls) => {
    setPendingSigns((prev) => {
      if (prev.length && prev[prev.length - 1].key === cls.key) return prev;
      return [...prev, cls].slice(-8);
    });
    logSignDetection({
      conversation_id: convoIdRef.current,
      sign_key: cls.key,
      confidence: cls.confidence,
      source: "mediapipe",
    }).catch(() => {});
    const phrase = phrasesRef.current.find((p) => p.key === cls.key);
    const label = phrase?.label || cls.key.replace(/_/g, " ");
    if (phrase?.emergency) {
      toast.error(`Emergency sign detected: ${label}`, { duration: 2200 });
    } else {
      toast.success(`Detected: ${label}`, { duration: 1400 });
    }
    const now = Date.now();
    // 2-second dedupe: same phrase won't be spoken again within 2s
    if (lastSpokenRef.current.key !== cls.key || now - lastSpokenRef.current.at > 2000) {
      lastSpokenRef.current = { key: cls.key, at: now };
      speakImmediate(label);
    }
  }, [speakImmediate]);

  const cam = useMediaPipeHands({ onSign: handleSignDetected });

  // bootstrap
  const convoIdRef = useRef(null);
  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          getPhrases(),
          createConversation({ title: "Live demo" }),
        ]);
        setPhrases(p);
        phrasesRef.current = p;
        setConvo(c);
        convoIdRef.current = c.id;
        refreshHealth();
      } catch (e) {
        toast.error("Backend not reachable");
      }
    })();
  }, [refreshHealth]);

  const refreshMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await getConversation(id);
      setMessages(data.messages || []);
    } catch { /* noop */ }
  }, []);

  const runVoiceToSign = async (text) => {
    if (!text.trim() || !convoIdRef.current) return;
    setV2sLoading(true);
    try {
      const out = await voiceToSign(text);
      setV2sTokens(out.sign_tokens);
      setV2sSimplified(out.simplified);
      setV2sSourceText(out.original || text);
      await addMessage(convoIdRef.current, {
        speaker: "hearing",
        direction: "voice_to_sign",
        text,
        sign_tokens: out.sign_tokens,
      });
      refreshMessages(convoIdRef.current);
    } catch (e) {
      toast.error(`Translation failed: ${e?.message || "error"}`);
    } finally {
      setV2sLoading(false);
    }
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const t = textInput.trim();
    setTextInput("");
    await runVoiceToSign(t);
  };

  const handlePushPhrase = (phrase) => {
    setPendingSigns((prev) => [...prev, { key: phrase.key, confidence: 0.99 }].slice(-8));
    logSignDetection({
      conversation_id: convoIdRef.current,
      sign_key: phrase.key,
      confidence: 0.99,
      source: "manual",
    }).catch(() => {});
  };

  const handleSpeakSigns = async () => {
    if (!pendingSigns.length || !convoIdRef.current) return;
    setS2vLoading(true);
    try {
      const out = await signToVoice(
        pendingSigns.map((s) => s.key),
        pendingSigns.reduce((acc, s) => acc + s.confidence, 0) / pendingSigns.length,
      );
      await addMessage(convoIdRef.current, {
        speaker: "deaf",
        direction: "sign_to_voice",
        text: out.sentence,
        sign_tokens: pendingSigns.map((s) => s.key),
        confidence: out.confidence,
      });
      // play TTS
      try {
        const blob = await speakTTS(out.sentence);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
      } catch (e) {
        toast.error("ElevenLabs TTS unavailable — using browser voice");
        const u = new SpeechSynthesisUtterance(out.sentence);
        window.speechSynthesis.speak(u);
      }
      setPendingSigns([]);
      refreshMessages(convoIdRef.current);
      toast.success("Spoken!");
    } catch (e) {
      toast.error("Voice generation failed");
    } finally {
      setS2vLoading(false);
    }
  };

  const clearPending = () => setPendingSigns([]);
  const llmAvailable = Boolean(health?.services?.llm?.ok);
  const ttsAvailable = Boolean(health?.services?.tts?.ok);
  const dbMode = health?.services?.database?.mode || "unknown";

  return (
    <div data-testid="studio-page" className="mx-auto max-w-[1500px] px-4 pb-12 pt-6 lg:px-6">
      <Toaster richColors position="top-right" />
      <div className="mb-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-[#DCD5C9] bg-white/85 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#5C6B62]">
              <ShieldAlert className="h-4 w-4 text-[#B34D41]" />
              Emergency workflow
            </div>
            <p className="text-sm text-[#5C6B62]">
              Priority signs stay pinned in the queue and are tracked in analytics. Use these shortcuts for urgent communication.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {emergencyPhrases.map((phrase) => (
              <button
                key={phrase.key}
                type="button"
                onClick={() => handlePushPhrase(phrase)}
                className="rounded-full border border-[#B34D41]/25 bg-[#B34D41]/8 px-3 py-1.5 text-xs font-medium text-[#8f3b33] transition-colors hover:bg-[#B34D41]/12"
              >
                {phrase.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#DCD5C9] bg-white/85 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[#5C6B62]">Live system notes</div>
          <div className="mt-2 space-y-2 text-sm text-[#1F2421]/80">
            <p>{healthError ? "Backend status is currently unavailable." : `Database mode: ${dbMode}.`}</p>
            <p>{llmAvailable ? "AI phrase simplification is live." : "AI phrase simplification is running in local fallback mode."}</p>
            <p>{ttsAvailable ? "Voice playback uses ElevenLabs." : "Voice playback will fall back to the browser voice."}</p>
          </div>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#5C6B62]">Live communication studio</div>
          <h1 className="mt-1 font-display text-2xl font-medium leading-tight sm:text-3xl">
            Speak on the left · Sign on the right · See the bridge in the middle
          </h1>
        </div>
        {convo && (
          <div className="rounded-full border border-[#DCD5C9] bg-white px-3 py-1.5 font-mono-ui text-xs text-[#5C6B62]" data-testid="session-id">
            session · {convo.id.slice(0, 8)}
          </div>
        )}
      </div>
      {emergencyQueue.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[#B34D41]/25 bg-[#B34D41]/8 p-4 text-[#8f3b33]" data-testid="emergency-queue-banner">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
            <AlertTriangle className="h-4 w-4" />
            Priority queue active
          </div>
          <p className="mt-2 text-sm">
            Emergency signs in queue: {emergencyQueue.map((item) => item.key.replace(/_/g, " ")).join(", ")}.
            Speaking now will prioritize urgent language for the hearing listener.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* HEARING PANE */}
        <section className="clay-card rounded-2xl p-5 lg:col-span-4" data-testid="hearing-panel">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
                <Mic strokeWidth={1.5} className="h-4 w-4 text-[#2E5A44]" /> Hearing user
              </div>
              <div className="font-display text-lg">Speak or type</div>
            </div>
            {speech.listening && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#B34D41]/10 px-3 py-1 text-xs font-medium text-[#B34D41]">
                <span className="dot-led bg-[#B34D41] animate-pulse" /> recording
              </span>
            )}
          </div>

          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              data-testid="mic-toggle-button"
              disabled={!speech.supported}
              onClick={speech.listening ? speech.stop : speech.start}
              className={`relative inline-flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ring-focus
                ${speech.listening
                  ? "bg-[#B34D41] text-white pulse-ring"
                  : "bg-[#2E5A44] text-white hover:bg-[#244a37]"}`}
            >
              {speech.listening ? <MicOff strokeWidth={1.6} className="h-6 w-6" /> : <Mic strokeWidth={1.6} className="h-6 w-6" />}
            </button>
            <div className="text-xs text-[#5C6B62]">
              {speech.supported ? (speech.listening ? "Listening… click to stop" : "Tap to start dictation") : "Browser does not support speech recognition — use the text box."}
            </div>
          </div>

          <div className="rounded-xl border border-[#DCD5C9] bg-[#F7F5F0] p-3 text-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#5C6B62]">Live transcript</div>
            <div className="mt-1 min-h-[44px] font-display text-base">
              {speech.transcript || speech.interim || <span className="text-[#5C6B62]">— speak something —</span>}
            </div>
          </div>

          <form onSubmit={handleSendText} className="mt-4 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder='Try: "I need a doctor"'
              data-testid="hearing-text-input"
              className="flex-1 rounded-full border border-[#DCD5C9] bg-white px-4 py-2.5 text-sm ring-focus"
            />
            <button
              type="submit"
              disabled={v2sLoading}
              data-testid="hearing-send-button"
              className="inline-flex items-center gap-2 rounded-full bg-[#2E5A44] px-5 text-sm font-medium text-white transition-colors hover:bg-[#244a37] disabled:opacity-60 ring-focus"
            >
              {v2sLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </form>

          <div className="mt-5">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#5C6B62]">Quick prompts</div>
            <div className="flex flex-wrap gap-2">
              {["Hello, how are you?", "Where is the bathroom?", "I need a doctor right now", "Please drink some water"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => runVoiceToSign(q)}
                  data-testid={`quick-prompt-${q.slice(0, 10)}`}
                  className="rounded-full border border-[#DCD5C9] bg-white px-3 py-1.5 text-xs text-[#1F2421] transition-all duration-300 hover:border-[#2E5A44] hover:text-[#2E5A44]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* SIGN OUTPUT CENTER */}
        <section className="clay-card rounded-2xl p-5 lg:col-span-4" data-testid="sign-output-panel">
          <SignReveal tokens={v2sTokens} phrases={phrases} simplified={v2sSimplified} sourceText={v2sSourceText} />
        </section>

        {/* DEAF PANE */}
        <section className="clay-card rounded-2xl p-5 lg:col-span-4" data-testid="deaf-panel">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
                <Camera strokeWidth={1.5} className="h-4 w-4 text-[#2E5A44]" /> Deaf user
              </div>
              <div className="font-display text-lg">Sign or tap</div>
            </div>
            {cam.running && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#2E5A44]/10 px-3 py-1 text-xs font-medium text-[#2E5A44]">
                <span className="dot-led bg-[#2E5A44] animate-pulse" /> tracking + speaking
              </span>
            )}
          </div>

          {/* Camera */}
          <div className="relative overflow-hidden rounded-xl border border-[#DCD5C9] bg-[#1F2421]">
            <video
              ref={cam.videoRef}
              className="webcam-video h-56 w-full object-cover"
              autoPlay
              muted
              playsInline
              data-testid="webcam-video"
            />
            <canvas
              ref={cam.canvasRef}
              className="webcam-video pointer-events-none absolute inset-0 h-full w-full"
            />
            {!cam.running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1F2421]/80 text-white/80">
                <Camera strokeWidth={1.2} className="h-10 w-10" />
                <p className="mt-2 text-xs uppercase tracking-[0.2em]">Camera off</p>
              </div>
            )}
            {cam.detection && cam.running && (
              <div className="absolute right-3 top-3 rounded-full bg-[#2E5A44] px-3 py-1 font-mono-ui text-xs text-white">
                {cam.detection.key} · {Math.round(cam.detection.confidence * 100)}%
                {cam.detection.hands ? ` · ${cam.detection.hands}H` : ""}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              data-testid="camera-toggle-button"
              onClick={cam.running ? cam.stop : cam.start}
              disabled={!cam.ready && !cam.running}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ring-focus
                ${cam.running ? "bg-[#B34D41] text-white hover:bg-[#9c4338]" : "bg-[#2E5A44] text-white hover:bg-[#244a37]"}
                disabled:opacity-60`}
            >
              {cam.running ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cam.running ? "Stop camera" : cam.ready ? "Start camera" : "Loading…"}
            </button>
            {cam.error && <span className="text-xs text-[#B34D41]">{cam.error}</span>}
          </div>

          {/* Manual phrase grid */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#5C6B62]">Tap to sign</div>
              <span className="text-[11px] text-[#5C6B62]">{phrases.length} phrases · {clipReadyCount} clips</span>
            </div>
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto pr-1 sm:grid-cols-3">
              {sortedPhrases.map((p) => (
                <SignCard
                  key={p.key}
                  phrase={p}
                  compact
                  active={pendingSigns.some((s) => s.key === p.key)}
                  onClick={() => handlePushPhrase(p)}
                />
              ))}
            </div>
          </div>

          {/* Pending signs + speak */}
          <div className="mt-5 rounded-xl border border-[#DCD5C9] bg-[#F7F5F0] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#5C6B62]">Sign queue</div>
              {pendingSigns.length > 0 && (
                <button onClick={clearPending} data-testid="clear-queue-button" className="text-[11px] text-[#5C6B62] underline-offset-2 hover:text-[#1F2421] hover:underline">
                  clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingSigns.length === 0 ? (
                <div className="text-xs text-[#5C6B62]">Sign or tap phrases — they queue here.</div>
              ) : pendingSigns.map((s, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                    emergencyKeys.has(s.key)
                      ? "border-[#B34D41]/25 bg-[#B34D41]/8 text-[#8f3b33]"
                      : "border-[#DCD5C9] bg-white text-[#1F2421]"
                  }`}
                >
                  {s.key.replace(/_/g, " ")}
                  <span className="font-mono-ui text-[10px] text-[#5C6B62]">{Math.round(s.confidence * 100)}%</span>
                </span>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-[#E6DFD3] bg-white px-3 py-2 text-xs text-[#5C6B62]">
              Camera detection speaks recognized signs out loud and adds them to the queue. Sign videos play in the center panel only when the hearing user speaks or types.
            </div>
            <button
              type="button"
              data-testid="speak-signs-button"
              disabled={!pendingSigns.length || s2vLoading}
              onClick={handleSpeakSigns}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2E5A44] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#244a37] disabled:opacity-50 ring-focus"
            >
              {s2vLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              {ttsAvailable ? "Speak with ElevenLabs voice" : "Speak with browser fallback"}
            </button>
            {audioUrl && (
              <audio ref={audioRef} src={audioUrl} controls className="mt-3 w-full" data-testid="tts-audio" />
            )}
          </div>
        </section>
      </div>

      {/* Transcript */}
      <section className="mt-6 clay-card rounded-2xl p-5" data-testid="transcript-panel">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
            <MessageSquare strokeWidth={1.5} className="h-4 w-4 text-[#2E5A44]" /> Conversation transcript
          </div>
          <span className="text-[11px] text-[#5C6B62]">{messages.length} messages</span>
        </div>
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#5C6B62]">No messages yet — start with the mic on the left or the camera on the right.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const isHearing = m.speaker === "hearing";
              return (
                <li key={m.id} className={`flex gap-3 ${isHearing ? "" : "flex-row-reverse"}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isHearing ? "bg-[#2E5A44] text-white" : "bg-[#B34D41] text-white"}`}>
                    {isHearing ? <Mic className="h-4 w-4" strokeWidth={1.6} /> : <Hand className="h-4 w-4" strokeWidth={1.6} />}
                  </div>
                  <div className={`max-w-[78%] rounded-2xl border border-[#DCD5C9] bg-white p-3 ${isHearing ? "" : "text-right"}`}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#5C6B62]">
                      {isHearing ? "Hearing → Sign" : "Sign → Voice"} · {new Date(m.created_at).toLocaleTimeString()}
                    </div>
                    <div className="mt-1 font-display text-sm">{m.text}</div>
                    {m.sign_tokens?.length > 0 && (
                      <div className={`mt-2 flex flex-wrap gap-1.5 ${isHearing ? "" : "justify-end"}`}>
                        {m.sign_tokens.map((t, i) => (
                          <span key={i} className="rounded-full bg-[#E6DFD3] px-2 py-0.5 text-[11px] text-[#1F2421]">
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
