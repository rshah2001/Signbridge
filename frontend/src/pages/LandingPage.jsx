import { Link } from "react-router-dom";
import { ArrowUpRight, AudioLines, Camera, Database, MessagesSquare, Sparkles, Shield } from "lucide-react";

const HERO_IMG = "https://images.pexels.com/photos/9017017/pexels-photo-9017017.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const CONSULT_IMG = "https://images.pexels.com/photos/6129441/pexels-photo-6129441.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const ASL_IMG = "https://images.pexels.com/photos/9017056/pexels-photo-9017056.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function LandingPage() {
  return (
    <div data-testid="landing-page">
      {/* HERO — asymmetric bento */}
      <section className="grain mx-auto max-w-7xl px-6 pb-20 pt-16 lg:pt-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-8 lg:grid-cols-12">
          {/* Eyebrow + title */}
          <div className="md:col-span-8 lg:col-span-7 fade-in-up">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#2E5A44]" />
              <span className="text-xs uppercase tracking-[0.28em] text-[#5C6B62]">
                Real-time accessibility · Tech for Good
              </span>
            </div>
            <h1 className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              A bridge between<br />
              <span className="text-[#2E5A44]">spoken word</span> and <span className="italic font-extralight">signed language</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#1F2421]/80">
              SignBridge AI translates speech into sign language and signs back into natural voice — instantly,
              in any clinic, classroom, or conversation. Powered by Gemini, ElevenLabs, MediaPipe, MongoDB and
              Snowflake-style accessibility intelligence.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/studio"
                data-testid="hero-cta-launch"
                className="group inline-flex items-center gap-2 rounded-full bg-[#2E5A44] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#244a37] ring-focus"
              >
                Launch live demo
                <ArrowUpRight strokeWidth={1.6} className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/analytics"
                data-testid="hero-cta-analytics"
                className="inline-flex items-center gap-2 rounded-full border border-[#DCD5C9] bg-white/60 px-6 py-3 text-sm font-medium text-[#1F2421] transition-all duration-300 hover:border-[#2E5A44] hover:text-[#2E5A44] ring-focus"
              >
                See Snowflake insights
              </Link>
            </div>
          </div>

          {/* Hero image card */}
          <div className="md:col-span-8 lg:col-span-5 fade-in-up" style={{ animationDelay: "120ms" }}>
            <div className="clay-card relative h-full overflow-hidden rounded-2xl">
              <img
                src={HERO_IMG}
                alt="Person signing"
                className="h-72 w-full object-cover lg:h-full"
              />
              <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-[#1F2421]/85 p-4 text-white backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">Live caption</div>
                <div className="mt-1 font-display text-lg">"I need a doctor, please."</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                  <span className="dot-led bg-[#B34D41] animate-pulse" /> 92% confidence · gemini · 0.34s
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="md:col-span-3 fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="clay-card h-full rounded-2xl p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">Recognized signs</div>
              <div className="mt-2 font-display text-5xl font-light text-[#2E5A44]">14</div>
              <p className="mt-3 text-sm text-[#1F2421]/70">MVP-ready phrases mapped to MediaPipe gestures.</p>
            </div>
          </div>
          <div className="md:col-span-2 fade-in-up" style={{ animationDelay: "240ms" }}>
            <div className="clay-card h-full rounded-2xl p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">Latency</div>
              <div className="mt-2 font-display text-5xl font-light text-[#2E5A44]">~0.4s</div>
              <p className="mt-3 text-sm text-[#1F2421]/70">Speech-to-sign round trip.</p>
            </div>
          </div>
          <div className="md:col-span-3 fade-in-up" style={{ animationDelay: "280ms" }}>
            <div className="clay-card h-full rounded-2xl border-[#2E5A44]/20 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">Accessibility KPI</div>
              <div className="mt-2 font-display text-5xl font-light text-[#2E5A44]">+38%</div>
              <p className="mt-3 text-sm text-[#1F2421]/70">Higher first-try comprehension in user trials.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-[#DCD5C9] bg-white/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <span className="text-xs uppercase tracking-[0.28em] text-[#5C6B62]">The pipeline</span>
            <h2 className="mt-3 font-display text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
              Two-way translation, in plain sight.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: AudioLines, title: "Capture", desc: "Browser microphone streams speech to text." },
              { icon: Sparkles, title: "Simplify", desc: "Gemini reduces sentences to sign-friendly phrases." },
              { icon: Camera, title: "Visualize", desc: "Animated sign cards + live MediaPipe hand tracking." },
              { icon: MessagesSquare, title: "Voice it back", desc: "ElevenLabs replies in a warm human voice." },
            ].map((s, i) => (
              <div key={s.title} className="clay-card group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#E6DFD3] text-[#2E5A44] transition-colors duration-300 group-hover:bg-[#2E5A44] group-hover:text-white">
                  <s.icon strokeWidth={1.5} className="h-5 w-5" />
                </div>
                <div className="font-display text-lg font-medium">{s.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-[#5C6B62]">{s.desc}</p>
                <div className="mt-5 marquee-line opacity-40 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="text-xs uppercase tracking-[0.28em] text-[#5C6B62]">Why it matters</span>
            <h2 className="mt-3 font-display text-2xl font-medium leading-tight sm:text-3xl lg:text-4xl">
              Built for moments that can't wait — clinics, classrooms, emergencies.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-[#1F2421]/75">
              466 million people worldwide are deaf or hard of hearing. SignBridge AI is a hand to hold the
              line of conversation steady, with a Snowflake-powered analytics layer that surfaces where
              communication breaks — and how to fix it.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#DCD5C9] bg-white p-4">
                <Shield strokeWidth={1.5} className="h-5 w-5 text-[#2E5A44]" />
                <div className="mt-3 font-display text-sm font-medium">Emergency-aware</div>
                <p className="mt-1 text-xs text-[#5C6B62]">Detects "Help", "Pain", "Doctor" and prioritises them.</p>
              </div>
              <div className="rounded-xl border border-[#DCD5C9] bg-white p-4">
                <Database strokeWidth={1.5} className="h-5 w-5 text-[#2E5A44]" />
                <div className="mt-3 font-display text-sm font-medium">Always learning</div>
                <p className="mt-1 text-xs text-[#5C6B62]">Corrections feed a Snowflake-style accuracy loop.</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="grid grid-cols-2 gap-4">
              <img src={CONSULT_IMG} alt="Healthcare consult" className="h-64 w-full rounded-2xl object-cover md:h-80" />
              <img src={ASL_IMG} alt="ASL demonstration" className="h-64 w-full rounded-2xl object-cover md:h-80 md:translate-y-8" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-[#2E5A44] text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-white/60">Demo ready</div>
            <h3 className="mt-2 font-display text-2xl font-medium md:text-3xl">
              Speak. Sign. Be understood — try it now.
            </h3>
          </div>
          <Link
            to="/studio"
            data-testid="footer-cta-launch"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#2E5A44] transition-all duration-300 hover:bg-[#E6DFD3] ring-focus"
          >
            Open the Studio <ArrowUpRight strokeWidth={1.6} className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
