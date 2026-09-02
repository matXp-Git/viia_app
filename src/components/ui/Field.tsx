import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const controlBase =
  "bg-transparent border border-divider rounded-sm px-(--space-3) py-(--space-3) text-sm text-body focus-ring disabled:opacity-45 disabled:cursor-not-allowed";

const labelBase = "text-2xs uppercase tracking-label text-muted";

type FieldWrapperProps = {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

function FieldWrapper({ label, error, className, children }: FieldWrapperProps) {
  return (
    <div className={`flex w-full flex-col gap-(--space-1) ${className || "max-w-[280px]"}`}>
      <label className={labelBase}>{label}</label>
      {children}
      {error ? <span className="text-xs text-critical">{error}</span> : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, className, ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error} className={className}>
      <input
        className={`${controlBase} ${error ? "border-critical" : ""}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldWrapper>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export function SelectField({ label, error, className, children, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error} className={className}>
      <select className={`${controlBase} ${error ? "border-critical" : ""}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}
