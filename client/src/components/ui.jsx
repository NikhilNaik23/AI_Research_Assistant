import React from "react";

export function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-pine text-white hover:bg-pine-dark",
    ghost: "bg-transparent text-ink hover:bg-pine-light border border-line",
    danger: "bg-transparent text-rust border border-rust/40 hover:bg-rust/5",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm text-ink/70">{label}</span>}
      <input
        className={`w-full rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-pine ${className}`}
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm text-ink/70">{label}</span>}
      <textarea
        className={`w-full rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-pine ${className}`}
        {...props}
      />
    </label>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <div className={`border border-line bg-white ${className}`} {...props}>
      {children}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    ready: "bg-pine-light text-pine-dark",
    completed: "bg-pine-light text-pine-dark",
    processing: "bg-gold-light text-gold",
    queued: "bg-gold-light text-gold",
    planning: "bg-gold-light text-gold",
    researching: "bg-gold-light text-gold",
    writing: "bg-gold-light text-gold",
    reviewing: "bg-gold-light text-gold",
    failed: "bg-rust/10 text-rust",
  };
  const cls = map[status] || "bg-line/50 text-ink/60";
  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line px-8 py-16 text-center">
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink/60">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="border border-rust/30 bg-rust/5 px-3 py-2 text-sm text-rust">{message}</div>
  );
}
