export function getPostAuthRedirectPath(
  buildPath: (path: string) => string,
): string {
  return buildPath("/");
}

export function redirectAfterAuth(
  buildPath: (path: string) => string,
  redirect: (path: string) => void = window.location.assign.bind(
    window.location,
  ),
): void {
  redirect(getPostAuthRedirectPath(buildPath));
}
