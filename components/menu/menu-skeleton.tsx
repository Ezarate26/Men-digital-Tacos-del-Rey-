export function MenuSkeleton() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 pt-8 pb-32 md:max-w-3xl">
      <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-gold/30" />
      <div className="mx-auto mt-4 h-8 w-56 animate-pulse rounded-full bg-foreground/10" />
      <div className="mx-auto mt-5 h-px w-16 bg-gold/40" />
      <div className="mt-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-10 w-36 shrink-0 animate-pulse rounded-full bg-surface"
          />
        ))}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-gold/20 bg-surface"
          >
            <div className="aspect-[4/3] animate-pulse bg-black" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-foreground/10" />
              <div className="h-3 w-full animate-pulse rounded-full bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
