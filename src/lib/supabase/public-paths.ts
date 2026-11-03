const LOGIN_PATH = "/login";
const AUTH_PREFIX = "/auth/";

/** Routes reachable without a session: the login page and /auth/*. */
export function isPublicPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname.startsWith(AUTH_PREFIX);
}
