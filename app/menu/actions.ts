"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { readTableCode } from "@/lib/menu/table-code";
import type { AttentionState } from "@/lib/menu/types";

export async function requestAttention(
  _previous: AttentionState,
  formData: FormData,
): Promise<AttentionState> {
  const tableInput = readTableCode(formData.get("mesa")?.toString());

  if (tableInput.kind === "absent") {
    return {
      status: "error",
      message:
        "Escanea el código QR de tu mesa para que el mesero sepa dónde estás.",
    };
  }

  if (tableInput.kind === "invalid") {
    return {
      status: "error",
      message: "No encontramos una mesa activa con ese código.",
    };
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("request_waiter_attention", {
    p_table_code: tableInput.code,
  });

  if (error) {
    if (error.message.includes("menu_no_disponible")) {
      return {
        status: "error",
        message: "En este momento no estamos recibiendo órdenes.",
      };
    }

    if (error.message.includes("mesa_invalida")) {
      return {
        status: "error",
        message: "No encontramos una mesa activa con ese código.",
      };
    }

    console.error("No se pudo registrar la solicitud de atención.");
    return {
      status: "error",
      message: "No pudimos avisar al mesero. Inténtalo de nuevo.",
    };
  }

  if (typeof data !== "string" || data.trim() === "") {
    return {
      status: "error",
      message: "No pudimos avisar al mesero. Inténtalo de nuevo.",
    };
  }

  return {
    status: "success",
    message: `Avisamos al mesero. En un momento llega a ${data}.`,
  };
}
