export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("x-cron-secret") === secret;
}
