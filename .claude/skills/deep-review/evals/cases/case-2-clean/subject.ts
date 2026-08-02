// Builds the Authorization header for the upstream mailer API.
export function mailerAuthHeader(): string {
  const key = process.env.MAILER_API_KEY;
  if (!key) throw new Error('MAILER_API_KEY is not set');
  return `Bearer ${key}`;
}
