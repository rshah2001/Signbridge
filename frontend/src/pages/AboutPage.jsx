import { Database, Cloud, Sparkles, AudioLines, Hand, Server } from "lucide-react";

const POSTER = "https://images.unsplash.com/photo-1773800924117-a387786c60a0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwzfHxzaWduJTIwbGFuZ3VhZ2UlMjBjb21tdW5pY2F0aW9ufGVufDB8fHx8MTc3NzE0ODY0MHww&ixlib=rb-4.1.0&q=85";

export default function AboutPage() {
  return (
    <div data-testid="about-page" className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <span className="text-xs uppercase tracking-[0.28em] text-[#5C6B62]">About SignBridge AI</span>
          <h1 className="mt-3 font-display text-4xl font-light leading-tight sm:text-5xl">
            We don't translate words. We translate <span className="text-[#2E5A44]">presence</span>.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-[#1F2421]/80">
            SignBridge AI is a hackathon-grade prototype demonstrating end-to-end accessibility infrastructure:
            speech recognition, Gemini sentence simplification, MediaPipe hand-tracking, and ElevenLabs voice
            synthesis — wired to a MongoDB transcript store and a Snowflake-style analytics layer that helps
            organizations identify where communication breaks down.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { icon: AudioLines, name: "Web Speech API", role: "Live STT" },
              { icon: Sparkles, name: "Gemini 2.5 Flash", role: "NLP simplify" },
              { icon: Hand, name: "MediaPipe Hands", role: "Gesture detect" },
              { icon: AudioLines, name: "ElevenLabs", role: "Multilingual TTS" },
              { icon: Database, name: "MongoDB", role: "Transcripts" },
              { icon: Cloud, name: "Snowflake-style", role: "Analytics" },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-[#DCD5C9] bg-white p-4">
                <t.icon strokeWidth={1.5} className="h-5 w-5 text-[#2E5A44]" />
                <div className="mt-3 font-display text-sm font-medium">{t.name}</div>
                <div className="text-xs text-[#5C6B62]">{t.role}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-[#DCD5C9] bg-white p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
              <Server strokeWidth={1.5} className="h-4 w-4" /> Architecture
            </div>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#1F2421] p-5 font-mono-ui text-xs leading-relaxed text-[#E6DFD3]">{`React (Studio)
  ├─ mic → Web Speech API → /api/translate/voice-to-sign  ──► Gemini → sign tokens
  ├─ webcam → MediaPipe Hands → classify → /api/signs/detect
  └─ sign tokens → /api/translate/sign-to-voice → /api/tts/speak ──► ElevenLabs

FastAPI (Server)
  ├─ MongoDB: conversations · messages · detected_signs · feedback
  └─ /api/analytics/snowflake  (top phrases · confidence · emergency trends)`}</pre>
          </div>
        </div>

        <div className="md:col-span-5">
          <img src={POSTER} alt="ASL alphabet" className="h-80 w-full rounded-2xl object-cover md:h-[28rem]" />
          <div className="mt-6 rounded-2xl border border-[#DCD5C9] bg-white p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">Pitch · 2 sentences</div>
            <p className="mt-3 font-display text-lg leading-snug text-[#1F2421]">
              SignBridge AI is the missing translation layer of the deaf and hearing world — a real-time
              two-way bridge that turns speech into sign and sign into voice.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#5C6B62]">
              With Gemini for understanding, ElevenLabs for warmth, MediaPipe for sight, and Snowflake for
              insight — we don't just connect users, we measure and improve every conversation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
