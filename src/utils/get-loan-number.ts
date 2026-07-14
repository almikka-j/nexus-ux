export function getLoanNumber(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return `PGFC-${(hash % 1000000).toString().padStart(6, '0')}`;
}
