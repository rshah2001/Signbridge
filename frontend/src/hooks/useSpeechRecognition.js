import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ onFinal } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript + " ";
        else interimText += res[0].transcript;
      }
      setInterim(interimText);
      if (finalText) {
        const t = finalText.trim();
        setTranscript(t);
        setInterim("");
        if (onFinal) onFinal(t);
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    return () => {
      try { r.stop(); } catch { /* noop */ }
    };
  }, [onFinal]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setInterim("");
    setTranscript("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch { /* already started */ }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  return { supported, listening, interim, transcript, start, stop };
}
