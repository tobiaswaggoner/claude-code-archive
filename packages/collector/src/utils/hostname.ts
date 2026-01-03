import { hostname } from "node:os";

/**
 * Get the effective hostname for this environment.
 *
 * In WSL (Windows Subsystem for Linux), returns "{hostname}:{WSL_DISTRO_NAME}"
 * to distinguish between different WSL distributions on the same Windows host.
 *
 * On native Windows, Linux, or macOS, returns the plain hostname.
 *
 * @example
 * // WSL Debian: "DESKTOP-ABC123:Debian"
 * // WSL Ubuntu: "DESKTOP-ABC123:Ubuntu"
 * // Windows: "DESKTOP-ABC123"
 * // Linux: "my-server"
 */
export function getEffectiveHostname(): string {
  const baseHostname = hostname();
  const wslDistro = process.env.WSL_DISTRO_NAME;

  if (wslDistro) {
    return `${baseHostname}:${wslDistro}`;
  }

  return baseHostname;
}
