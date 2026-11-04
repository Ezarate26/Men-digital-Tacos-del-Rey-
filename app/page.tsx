import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-lg rounded-xl border border-gold/50 bg-surface/80 px-8 py-10">
        <p className="text-sm tracking-[0.35em] text-gold">TAQUERÍA</p>

        <h1 className="mt-4 text-4xl font-bold tracking-wide md:text-5xl">TACOS DEL REY</h1>

        <div className="mx-auto my-6 h-px w-20 bg-gold" />

        <p className="text-sm tracking-[0.28em] text-foreground/75">SABOR QUE REINA</p>

        <Link
          href="/menu"
          className="mt-8 inline-flex min-w-[12rem] items-center justify-center rounded-xl bg-gold px-8 py-3.5 text-sm font-bold tracking-[0.22em] text-background shadow-[0_10px_28px_rgba(201,164,92,0.28)] transition hover:bg-gold-light"
        >
          VER MENÚ
        </Link>

        <blockquote className="mt-10 border-t border-gold/20 pt-6 text-center">
          <p className="text-[0.68rem] tracking-[0.18em] text-gold/70 uppercase">Salmos 128:2</p>
          <p className="mt-2 text-xs leading-6 text-foreground/55 italic">
            “Cuando comieres el trabajo de tus manos, bienaventurado serás, y te irá bien.”
          </p>
          <p className="mt-2 text-[0.7rem] leading-5 text-foreground/40">
            Representa el esfuerzo detrás de Tacos del Rey.
          </p>
        </blockquote>
      </div>
    </main>
  );
}
