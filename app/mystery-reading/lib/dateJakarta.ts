/** Calendar date YYYY-MM-DD in Asia/Jakarta */
export function jakartaDateString(d = new Date()): string {
  return d.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}
