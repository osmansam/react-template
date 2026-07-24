import { validateTokenForTenantProject } from "../utils/jwtUtils";

function getTenantProjectFromPath(pathname: string) {
  const pathParts = pathname.split("/");
  const tenantIndex = pathParts.indexOf("t");
  const projectIndex = pathParts.indexOf("p");

  if (
    tenantIndex === -1 ||
    projectIndex === -1 ||
    !pathParts[tenantIndex + 1] ||
    !pathParts[projectIndex + 1]
  ) {
    return null;
  }

  return {
    tenant: pathParts[tenantIndex + 1],
    project: pathParts[projectIndex + 1],
  };
}

export function isAuthPublicRoute(pathname: string) {
  return (
    pathname.endsWith("/login") ||
    pathname === "/login" ||
    pathname.includes("/auth/google/callback") ||
    pathname === "/auth/google/callback"
  );
}

export function shouldLoadDynamicPages(pathname: string, token: string | null) {
  if (isAuthPublicRoute(pathname) || !token) {
    return false;
  }

  const tenantProject = getTenantProjectFromPath(pathname);
  if (!tenantProject) {
    return true;
  }

  return validateTokenForTenantProject(
    token,
    tenantProject.tenant,
    tenantProject.project,
  );
}
