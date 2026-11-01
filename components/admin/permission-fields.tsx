"use client";

import { useState } from "react";
import { PERMISSION_GROUPS, type Permission } from "@/lib/auth/permissions";

export function PermissionFields({
  selected,
  disabled = false,
}: {
  selected: Permission[];
  disabled?: boolean;
}) {
  const [current, setCurrent] = useState(selected);

  return (
    <div className="grid gap-4">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.id} className="grid gap-2" disabled={disabled}>
          <legend className="text-xs tracking-[0.16em] text-gold">{group.label}</legend>
          {group.items.map((item) => (
            <label key={item.key} className="flex items-start gap-3 text-sm leading-5">
              <input
                type="checkbox"
                name="permissions"
                value={item.key}
                checked={current.includes(item.key)}
                onChange={(event) => {
                  setCurrent((items) =>
                    event.target.checked
                      ? [...items, item.key]
                      : items.filter((key) => key !== item.key),
                  );
                }}
              />
              <span>
                <span className="block text-foreground">{item.label}</span>
                <span className="block text-foreground/60">{item.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
      {disabled ? null : (
        <button
          type="button"
          className="justify-self-start text-sm text-gold"
          onClick={() => setCurrent(selected)}
        >
          Cancelar cambios
        </button>
      )}
    </div>
  );
}
