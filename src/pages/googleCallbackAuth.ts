import { QueryClient } from "@tanstack/react-query";

type QueryInvalidator = Pick<QueryClient, "invalidateQueries">;

export async function refreshAfterGoogleLogin(
  queryClient: QueryInvalidator,
): Promise<void> {
  await queryClient.invalidateQueries();
}

export function getPostGoogleLoginRedirectPath(
  buildPath: (path: string) => string,
): string {
  return buildPath("/");
}

export function redirectAfterGoogleLogin(
  buildPath: (path: string) => string,
  redirect: (path: string) => void = window.location.assign.bind(
    window.location,
  ),
): void {
  redirect(getPostGoogleLoginRedirectPath(buildPath));
}
