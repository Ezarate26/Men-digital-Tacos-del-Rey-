"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { idleAction, type ActionState } from "@/lib/admin/types";

const control =
  "w-full rounded-xl border border-gold/30 bg-black px-3 py-2 text-sm text-foreground outline-none focus:border-gold";

export function BoundForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, idleAction);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") {
      ref.current?.reset();
    }
  }, [resetOnSuccess, state]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-sm ${state.status === "error" ? "text-gold-light" : "text-gold"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function SubmitButton({
  children,
  tone = "solid",
}: {
  children: React.ReactNode;
  tone?: "solid" | "ghost";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        tone === "solid"
          ? "rounded-full bg-gold px-4 py-2 text-sm font-semibold tracking-wide text-black disabled:opacity-60"
          : "rounded-full border border-gold/40 px-4 py-2 text-sm tracking-wide text-gold-light disabled:opacity-60"
      }
    >
      {pending ? "Guardando..." : children}
    </button>
  );
}

export function ConfirmSubmit({
  children,
  message,
}: {
  children: React.ReactNode;
  message: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-gold/40 px-4 py-2 text-sm text-gold-light disabled:opacity-60"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? "Eliminando..." : children}
    </button>
  );
}

export function TextField({
  label,
  name,
  defaultValue,
  required = false,
  type = "text",
  min,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  type?: string;
  min?: number;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs tracking-[0.14em] text-gold-light uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={step}
        className={control}
      />
    </label>
  );
}

export function AreaField({
  label,
  name,
  defaultValue = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs tracking-[0.14em] text-gold-light uppercase">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className={control}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs tracking-[0.14em] text-gold-light uppercase">
        {label}
      </span>
      <select name={name} defaultValue={defaultValue} className={control}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckField({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground/80">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-[#c9a45c]"
      />
      {label}
    </label>
  );
}

export function FileField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs tracking-[0.14em] text-gold-light uppercase">
        {label}
      </span>
      <input
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="block w-full text-sm text-foreground/80 file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:text-black"
      />
    </label>
  );
}
