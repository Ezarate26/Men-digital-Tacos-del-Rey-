import { Suspense } from "react";
import type { Metadata } from "next";
import { MenuContent } from "@/components/menu/menu-content";
import { MenuSkeleton } from "@/components/menu/menu-skeleton";

export const metadata: Metadata = {
  title: "Menú | Tacos del Rey",
  description: "Menú digital de Tacos del Rey",
};

export default function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent searchParams={searchParams} />
    </Suspense>
  );
}
