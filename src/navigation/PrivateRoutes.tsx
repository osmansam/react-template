import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useTenantProject } from "../hooks/useTenantProject";
import { ACCESS_TOKEN } from "../utils/api/axiosClient";
import { validateTokenForTenantProject } from "../utils/jwtUtils";
import { PublicRoutes } from "./constants";

export function PrivateRoutes() {
  useAuth();
  const location = useLocation();
  const { tenant, project, buildPath } = useTenantProject();
  const token = localStorage.getItem(ACCESS_TOKEN);

  // If no token, redirect to login
  if (!token) {
    const loginPath =
      tenant && project ? buildPath("/login") : PublicRoutes.Login;
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If we have tenant/project in URL, validate token matches
  if (tenant && project) {
    const isValid = validateTokenForTenantProject(token, tenant, project);
    if (!isValid) {
      // Token doesn't match tenant/project or is expired
      console.warn("❌ Token invalid - clearing and redirecting to login");
      localStorage.removeItem(ACCESS_TOKEN);
      return (
        <Navigate to={buildPath("/login")} state={{ from: location }} replace />
      );
    }
  }

  return <Outlet />;
}
