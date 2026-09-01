import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "accent" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm uppercase tracking-label px-(--space-5) py-(--space-3) transition-opacity duration-(--duration-fast) ease-(--ease-standard) focus-ring disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  accent: "bg-accent text-accent-text",
  ghost: "border border-black text-black",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "accent", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

type LinkButtonProps = {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

export function LinkButton({ href, variant = "accent", className = "", children }: LinkButtonProps) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
