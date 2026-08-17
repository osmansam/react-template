import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTenantProject } from "../hooks/useTenantProject";
import { axiosClient } from "../utils/api/axiosClient";
import { PublicRoutes } from "./constants";

export function PrivateRoutes() {
  const location = useLocation();
  const { tenant, project, buildPath } = useTenantProject();
  const session = useQuery({
    queryKey: ["auth", "session", tenant, project],
    queryFn: async () => (await axiosClient.get("/auth/session")).data,
    retry: false,
    staleTime: 30_000,
  });

  // Show loading/blank during initial check to prevent 404 flash
  if (session.isPending) {
    return <div className="min-h-screen" />;
  }

  // If no token, redirect to login
  if (!session.data?.authenticated) {
    const loginPath =
      tenant && project ? buildPath("/login") : PublicRoutes.Login;
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
