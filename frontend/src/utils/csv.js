/**
 * Spreadsheet apps run text that starts with = + - @ (or a tab / carriage
 * return) as a formula, so a name like `=HYPERLINK(...)` in an export could
 * execute when opened in Excel. Prefix such values with an apostrophe so they
 * are shown as plain text. Plain numbers and phone numbers (e.g. "+91 98765
 * 43210", "-5") are left untouched.
 */
export function neutralizeFormula(text) {
  if (!/^[=+\-@\t\r]/.test(text)) return text;
  if (/^[+-]?[\d\s().-]+$/.test(text) && /\d/.test(text)) return text;
  return `'${text}`;
}

/** One CSV cell: formula-safe, always quoted, internal quotes doubled. */
export function escapeCsvValue(value) {
  const text = neutralizeFormula(String(value ?? ""));
  return `"${text.replace(/"/g, '""')}"`;
}
