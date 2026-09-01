import type { ReactNode } from "react";

type ListRowProps = {
  badge: ReactNode;
  title: string;
  meta: string;
  value: string;
};

export function ListRow({ badge, title, meta, value }: ListRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr_120px_90px] items-center gap-(--space-4) border-t border-line py-(--space-3) text-sm max-mobile:grid-cols-1 max-mobile:gap-1 last:border-b">
      {badge}
      <span className="text-black">{title}</span>
      <span className="text-xs text-charcoal/60">{meta}</span>
      <span className="text-right font-bold text-black max-mobile:text-left">{value}</span>
    </div>
  );
}
