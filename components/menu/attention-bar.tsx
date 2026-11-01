"use client";

import { useActionState } from "react";
import { requestAttention } from "@/app/menu/actions";
import type { AttentionState } from "@/lib/menu/types";

const initialState: AttentionState = {
  status: "idle",
  message: "",
};

export function AttentionBar({ tableCode }: { tableCode: string | null }) {
  const [state, formAction, pending] = useActionState(
    requestAttention,
    initialState,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/40 bg-background/95 px-4 pt-3 backdrop-blur-md pb-[max(0.85rem,env(safe-area-inset-bottom))]">
      <form action={formAction} className="mx-auto w-full max-w-lg md:max-w-3xl">
        <input type="hidden" name="mesa" value={tableCode ?? ""} />

        {state.status === "success" ? (
          <p
            role="status"
            className="rounded-2xl border border-gold bg-surface px-4 py-4 text-center text-sm tracking-wide text-gold-light"
          >
            {state.message}
          </p>
        ) : (
          <>
            {state.status === "error" ? (
              <p role="alert" className="mb-2 text-center text-sm text-gold-light">
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-gold px-5 py-4 text-sm font-bold tracking-[0.14em] text-black transition-opacity disabled:cursor-wait disabled:opacity-70"
            >
              {pending ? "AVISANDO AL MESERO..." : "ESTOY LISTO PARA ORDENAR"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
