export function profileSearchFilter(term: string) {
  const literal = term.trim().replace(/^@/, "").replace(/[\\%_]/g, "\\$&");
  const pattern = JSON.stringify(`%${literal}%`);
  return `username.ilike.${pattern},full_name.ilike.${pattern}`;
}
