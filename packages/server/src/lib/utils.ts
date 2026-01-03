/**
 * Normalize git remote URLs to a canonical form for matching.
 * - git@github.com:user/repo.git → github.com/user/repo
 * - https://github.com/user/repo.git → github.com/user/repo
 */
export function normalizeUpstreamUrl(url: string): string {
  return url
    .replace(/^git@([^:]+):/, "$1/") // git@ to path
    .replace(/^https?:\/\//, "") // remove protocol
    .replace(/\.git$/, "") // remove .git suffix
    .toLowerCase(); // case-insensitive
}

/**
 * Generate a random hex string (for sync_run_id etc.)
 */
export function randomHex(length: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Parse pagination parameters with defaults
 */
export function parsePagination(
  limit?: string | number,
  offset?: string | number
): { limit: number; offset: number } {
  return {
    limit: Math.min(Math.max(Number(limit) || 50, 1), 1000),
    offset: Math.max(Number(offset) || 0, 0),
  };
}
