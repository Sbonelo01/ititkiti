/** Empty display for zero avoids "05" when typing over a controlled 0. */
export function numericFieldDisplayValue(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return String(n);
}

export function parseNumericFieldValue(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === ".") return 0;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Digits only; strips leading zeros (keeps single "0"). */
export function sanitizeIntegerInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length > 1) return digits.replace(/^0+/, "") || "0";
  return digits;
}

export function parsePositiveIntFieldValue(raw: string): number {
  const trimmed = sanitizeIntegerInput(raw.trim());
  if (trimmed === "") return 0;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Decimal currency input; strips leading zeros on the integer part. */
export function sanitizeDecimalInput(raw: string): string {
  let s = raw.replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }

  if (s.includes(".")) {
    const [intPart, fracPart = ""] = s.split(".");
    const intClean =
      intPart === "" ? "0" : intPart.replace(/^0+(?=\d)/, "") || "0";
    if (s.endsWith(".") && fracPart === "") {
      return `${intClean}.`;
    }
    return fracPart.length > 0 ? `${intClean}.${fracPart}` : intClean;
  }

  if (s.length > 1) return s.replace(/^0+/, "") || "0";
  return s;
}
