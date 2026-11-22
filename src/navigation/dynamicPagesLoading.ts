import { parseProjectScope, projectPath } from "../utils/projectScope";

export function isAuthPublicRoute(pathname: string) {
  return (
    pathname.endsWith("/login") ||
    pathname === "/login" ||
    pathname.includes("/auth/google/callback") ||
    pathname === "/auth/google/callback"
  );
}

export function shouldLoadDynamicPages(pathname: string, isLoggedIn: boolean) {
  return !isAuthPublicRoute(pathname) && isLoggedIn;
}

export function getDynamicPagesAuthFailureRedirect(
  pathname: string,
  error: unknown,
): string | undefined {
  const response = (error as {
    response?: { status?: number; data?: { statusCode?: number } };
  } | null)?.response;
  if (response?.status !== 401 && response?.data?.statusCode !== 401) {
    return undefined;
  }
  return projectPath(parseProjectScope(pathname), "/login");
}
