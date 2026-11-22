import { currentProjectScope, type ProjectScope } from "../utils/projectScope";
import { QueryClient } from "@tanstack/react-query";

type QueryInvalidator = Pick<QueryClient, "invalidateQueries">;

export async function refreshAfterGoogleLogin(
  queryClient: QueryInvalidator,
  scope: ProjectScope | null = currentProjectScope(),
): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: query => query.queryKey[1] === (scope?.tenant ?? "") && query.queryKey[2] === (scope?.project ?? ""),
  });
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
