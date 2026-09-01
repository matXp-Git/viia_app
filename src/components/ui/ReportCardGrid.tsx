type ReportCell = {
  label: string;
  value: string;
};

export function ReportCardGrid({ cells }: { cells: ReportCell[] }) {
  return (
    <div
      className="grid w-full max-w-[420px] gap-px border border-line bg-line max-mobile:grid-cols-1"
      style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}
    >
      {cells.map((cell) => (
        <div key={cell.label} className="bg-white p-(--space-4)">
          <div className="text-2xs uppercase text-charcoal/60">{cell.label}</div>
          <div className="mt-(--space-2) text-sm font-bold text-black">{cell.value}</div>
        </div>
      ))}
    </div>
  );
}
