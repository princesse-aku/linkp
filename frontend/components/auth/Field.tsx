"use client";

import { useId, useState } from "react";
import { IconEye, IconEyeOff } from "@/components/Icons";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: React.ReactNode;
  aside?: React.ReactNode;
};

const inputCls =
  "w-full rounded-xl border border-line bg-paper px-4 py-3.5 text-base text-ink placeholder:text-stone-400 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15";

export default function Field({ label, value, onChange, hint, aside, type = "text", ...rest }: Props) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          {...rest}
          id={id}
          type={isPassword && shown ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} ${isPassword ? "pr-14" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:text-ink"
          >
            {shown ? <IconEyeOff /> : <IconEye />}
          </button>
        )}
      </div>
      {hint && <div className="mt-2 text-sm text-stone-500">{hint}</div>}
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">
      {children}
    </p>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-7 py-4 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-dark disabled:opacity-60"
    >
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
      {children}
    </button>
  );
}

// Force indicative du mot de passe : aide visuelle uniquement, Firebase impose 6 caractères minimum.
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  const labels = ["Trop court", "Faible", "Correct", "Solide", "Excellent"];
  const colors = ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-lime-500", "bg-forest"];
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? colors[score] : "bg-line"}`} />
        ))}
      </div>
      <span className="w-16 text-right text-sm text-stone-600">{value.length < 6 ? labels[0] : labels[score]}</span>
    </div>
  );
}
