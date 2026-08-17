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
