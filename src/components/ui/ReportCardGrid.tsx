type ReportCell = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export function ReportCardGrid({
  cells,
  columns,
  className = "max-w-[420px]",
}: {
  cells: ReportCell[];
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid w-full gap-0.5 border-2 border-divider bg-divider max-mobile:grid-cols-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns ?? cells.length}, 1fr)` }}
    >
      {cells.map((cell) => (
        <div key={cell.label} className="bg-surface p-(--space-5)">
          <div className="text-2xs uppercase text-muted">{cell.label}</div>
          <div
            className={
              cell.emphasis
                ? "mt-(--space-2) text-2xl font-bold text-critical"
                : "mt-(--space-2) text-sm font-bold text-heading"
            }
          >
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}
