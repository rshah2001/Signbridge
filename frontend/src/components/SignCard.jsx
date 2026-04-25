import { iconFor } from "../lib/signIcons";

export const SignCard = ({ phrase, active, onClick, compact }) => {
  const Icon = iconFor(phrase.icon);
  const emergency = phrase.emergency;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`sign-card-${phrase.key}`}
      className={`group relative flex flex-col items-start gap-3 overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 ring-focus
        ${active
          ? "border-[#2E5A44] bg-[#2E5A44] text-white sign-card-active"
          : "border-[#DCD5C9] bg-white text-[#1F2421] hover:-translate-y-1 hover:border-[#2E5A44]"}
        ${compact ? "p-3" : "p-5"}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-300
        ${active ? "bg-white/15 text-white" : emergency ? "bg-[#B34D41]/10 text-[#B34D41]" : "bg-[#E6DFD3] text-[#2E5A44]"}`}>
        <Icon strokeWidth={1.5} className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <div className={`font-display ${compact ? "text-sm" : "text-base"} font-medium leading-tight`}>
          {phrase.label}
        </div>
        {!compact && (
          <div className={`text-xs leading-snug ${active ? "text-white/80" : "text-[#5C6B62]"}`}>
            {phrase.description}
          </div>
        )}
      </div>
      {emergency && !active && (
        <span className="absolute right-3 top-3 rounded-full bg-[#B34D41]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#B34D41]">
          alert
        </span>
      )}
    </button>
  );
};
