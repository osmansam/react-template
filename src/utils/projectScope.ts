export interface ProjectScope {
  tenant: string;
  project: string;
}

export function parseProjectScope(pathname: string): ProjectScope | null {
  const match = /^\/t\/([^/]+)\/p\/([^/]+)(?:\/|$)/.exec(pathname);
  if (!match) return null;
  try {
    const [tenant, project] = match.slice(1).map(decodeURIComponent);
    if ([tenant, project].some(part => !part.trim() || part === "." || part === ".." || /[/\\]/.test(part))) return null;
    return { tenant, project };
  } catch {
    return null;
  }
}

export function currentProjectScope() {
  return typeof window === "undefined" ? null : parseProjectScope(window.location.pathname);
}

export function projectPath(scope: ProjectScope | null, path: string) {
  if (!scope) return path;
  return `/t/${encodeURIComponent(scope.tenant)}/p/${encodeURIComponent(scope.project)}${path.startsWith("/") ? path : "/" + path}`;
}

export function projectQueryKey(scope: ProjectScope | null, [family, ...parts]: readonly unknown[]) {
  return [family, scope?.tenant ?? "", scope?.project ?? "", ...parts];
}
