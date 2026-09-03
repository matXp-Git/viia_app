const sizeClasses = {
  sm: "h-3 w-3",
  lg: "h-6 w-6",
};

export function LivePulse({ size = "sm" }: { size?: "sm" | "lg" }) {
  const cls = sizeClasses[size];
  return (
    <span className={`relative flex ${cls}`}>
      <span className={`absolute inline-flex ${cls} animate-ping rounded-full bg-accent opacity-75`} />
      <span className={`relative inline-flex ${cls} rounded-full bg-accent`} />
    </span>
  );
}
