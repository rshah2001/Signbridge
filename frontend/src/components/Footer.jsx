export const Footer = () => (
  <footer className="border-t border-[#DCD5C9] bg-[#F7F5F0]" data-testid="site-footer">
    <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-10 md:flex-row md:items-center">
      <div className="font-display text-sm tracking-wide text-[#1F2421]/80">
        SignBridge AI · Communication without barriers
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
        <span>Gemini · ElevenLabs · MediaPipe · Local Storage</span>
        <span className="font-mono-ui text-[#2E5A44]">v0.1 demo</span>
      </div>
    </div>
  </footer>
);
