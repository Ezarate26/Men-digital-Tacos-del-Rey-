"use client";

export default function MenuError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6">
      <div className="w-full rounded-2xl border border-gold/40 bg-surface px-6 py-10 text-center">
        <p className="text-xs tracking-[0.35em] text-gold">TAQUERÍA</p>
        <h1 className="mt-3 text-3xl font-bold tracking-wide">TACOS DEL REY</h1>
        <p className="mt-4 text-sm leading-6 text-foreground/75">
          Ocurrió un problema al abrir el menú.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-full border border-gold px-5 py-3 text-sm tracking-[0.14em] text-gold"
        >
          REINTENTAR
        </button>
      </div>
    </main>
  );
}
