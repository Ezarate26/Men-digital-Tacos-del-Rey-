"use client";

import { useActionState } from "react";
import { requestAttention } from "@/app/menu/actions";
import type { AttentionState } from "@/lib/menu/types";

const initialState: AttentionState = {
  status: "idle",
  message: "",
};

export function AttentionBar({
  tableCode,
  label,
}: {
  tableCode: string | null;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    requestAttention,
    initialState,
  );

  return (
    <div className="menu-attention menu-attention-fixed">
      <form action={formAction} className="menu-attention-inner">
        <input type="hidden" name="mesa" value={tableCode ?? ""} />

        {state.status === "success" ? (
          <p
            role="status"
            className="menu-status"
          >
            {state.message}
          </p>
        ) : (
          <>
            {state.status === "error" ? (
              <p role="alert" className="menu-alert">
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="menu-button"
            >
              {pending ? "AVISANDO AL MESERO..." : label}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
