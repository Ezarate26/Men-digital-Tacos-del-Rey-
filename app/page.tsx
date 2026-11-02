import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="border border-[#c9a45c] p-8 rounded-xl max-w-lg w-full">
        <p className="text-[#c9a45c] tracking-[0.35em] text-sm mb-4">
          TAQUERÍA
        </p>

        <h1 className="text-4xl md:text-5xl font-bold tracking-wide">
          TACOS DEL REY
        </h1>

        <div className="w-20 h-px bg-[#c9a45c] mx-auto my-6" />

        <Link
          href="/menu"
          className="mt-8 inline-block text-sm tracking-widest text-[#c9a45c]"
        >
          VER MENÚ
        </Link>

        <p className="font-bold mt-8 tracking-[0.35em] text-sm mb-4">
          SABOR QUE REINA
        </p>
      </div>
    </main>
  );
}
