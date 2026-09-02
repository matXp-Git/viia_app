export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-(--space-3) text-xs tracking-eyebrow text-muted">
      <span>{children}</span>
      <span className="h-px flex-1 bg-divider" />
    </div>
  );
}

export function DataLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs uppercase tracking-label text-muted">{children}</span>;
}
