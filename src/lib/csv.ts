export function csvCell(value: unknown) {
  let s = String(value ?? '');
  if (/^\s*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function toCsv(rows: unknown[][]) {
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
