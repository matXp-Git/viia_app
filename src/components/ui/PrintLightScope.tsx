// Screens are dark for manager/portal-style pages, but a printed or PDF
// document should be dark text on white paper. Inside this wrapper the
// semantic color tokens are re-pointed at the light brand tokens, print only.
export function PrintLightScope({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`print-light ${className}`}>
      <style>{`
        @media print {
          .print-light {
            --color-page: var(--color-white);
            --color-surface: var(--color-white);
            --color-heading: var(--color-black);
            --color-body: var(--color-charcoal);
            --color-muted: var(--color-charcoal);
            --color-divider: var(--color-line);
            color-scheme: light;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
