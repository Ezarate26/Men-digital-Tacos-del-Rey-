const TABLE_CODE = /^[A-Za-z0-9-]{1,12}$/;

export function isTableCode(value: string) {
  return TABLE_CODE.test(value);
}

export type TableCodeInput =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "code"; code: string };

export function readTableCode(
  value: string | string[] | undefined | null,
): TableCodeInput {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string" || raw.trim() === "") {
    return { kind: "absent" };
  }

  const code = raw.trim();

  if (!TABLE_CODE.test(code)) {
    return { kind: "invalid" };
  }

  return { kind: "code", code };
}
