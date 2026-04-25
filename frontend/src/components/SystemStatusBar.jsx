import { AlertTriangle, AudioLines, BrainCircuit, Database, RefreshCcw, Server } from "lucide-react";
import { useAppHealth } from "../context/AppHealthContext";

const serviceMeta = {
  database: { label: "Local Store", icon: Database },
  llm: { label: "Gemini", icon: BrainCircuit },
  tts: { label: "Voice", icon: AudioLines },
};

function StatusChip({ label, icon: Icon, ok, detail }) {
  return (
    <div
      className={`rounded-full border px-3 py-1.5 text-xs ${
        ok
          ? "border-[#2E5A44]/20 bg-[#2E5A44]/8 text-[#244a37]"
          : "border-[#B34D41]/25 bg-[#B34D41]/8 text-[#8f3b33]"
      }`}
      title={detail}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
        <span className={`dot-led ${ok ? "bg-[#2E5A44]" : "bg-[#B34D41]"}`} />
      </span>
    </div>
  );
}

export function SystemStatusBar() {
  const { health, loading, error, refresh } = useAppHealth();

  return (
    <section className="border-b border-[#DCD5C9] bg-white/75 backdrop-blur" data-testid="system-status-bar">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD5C9] bg-[#F7F5F0] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#5C6B62]">
            <Server className="h-3.5 w-3.5 text-[#2E5A44]" />
            System status
          </div>
          {loading && <div className="text-xs text-[#5C6B62]">Checking backend services…</div>}
          {!loading && error && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B34D41]/25 bg-[#B34D41]/8 px-3 py-1.5 text-xs text-[#8f3b33]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Backend unreachable
            </div>
          )}
          {!loading && !error && health && (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD5C9] bg-[#F7F5F0] px-3 py-1.5 text-xs text-[#5C6B62]">
                Mode
                <span className="font-mono-ui uppercase text-[#1F2421]">{health.mode}</span>
              </div>
              {Object.entries(serviceMeta).map(([key, meta]) => (
                <StatusChip
                  key={key}
                  label={meta.label}
                  icon={meta.icon}
                  ok={Boolean(health.services?.[key]?.ok)}
                  detail={health.services?.[key]?.detail}
                />
              ))}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 self-start rounded-full border border-[#DCD5C9] bg-[#F7F5F0] px-3 py-1.5 text-xs text-[#1F2421] transition-colors hover:border-[#2E5A44] hover:text-[#2E5A44] lg:self-auto"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh status
        </button>
      </div>
    </section>
  );
}
