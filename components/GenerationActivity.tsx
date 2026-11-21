interface Props {
  label: string;
  lang: 'en' | 'zh';
  className?: string;
  description?: string;
}

const tileDelays = Array.from({ length: 64 }, (_, index) =>
  `${((index % 8) + Math.floor(index / 8)) * 0.15}s`,
);

export default function GenerationActivity({ label, lang, className = '', description }: Props) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black/80 ${className}`}>
      <div aria-hidden="true" className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {tileDelays.map((delay, index) => (
          <span key={index} className="generation-activity-tile" style={{ animationDelay: delay }} />
        ))}
      </div>
      <div role="status" className="relative flex flex-col items-center gap-2 px-3 text-center"
        style={{ fontSize: lang === 'zh' ? '11px' : '8px' }}>
        <div className="font-bold uppercase tracking-[0.18em] text-white motion-safe:animate-pulse">{label}</div>
        <div aria-hidden="true" className="flex gap-1">
          <span className="h-1 w-1 bg-white motion-safe:animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1 w-1 bg-white motion-safe:animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1 w-1 bg-white motion-safe:animate-bounce" />
        </div>
        {description && <p className="leading-relaxed text-white/60">{description}</p>}
      </div>
    </div>
  );
}
