import { useEffect } from "react";
import { useUserContext } from "../context/User.context";
import { clearProjectSession, setProjectSessionItem } from "../utils/projectSessionStorage";
import { getDynamicPagesAuthFailureRedirect } from "./dynamicPagesLoading";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTenantProject } from "../hooks/useTenantProject";
import { axiosClient } from "../utils/api/axiosClient";
import { PublicRoutes } from "./constants";

export function PrivateRoutes() {
  const location = useLocation();
  const { user, setUser, signedIn } = useUserContext();
  const { requestConfig, tenant, project, buildPath } = useTenantProject();
  const session = useQuery({
    queryKey: ["auth", "session", tenant, project],
    queryFn: async ({ signal }) => (await axiosClient.get("/auth/session", { ...requestConfig, signal })).data,
    retry: false,
    staleTime: 30_000,
  });

  const expired = session.data?.authenticated === false || Boolean(getDynamicPagesAuthFailureRedirect(location.pathname, session.error));
  const verifiedUser = session.data?.authenticated && session.data.user;
  const verifiedId = verifiedUser?._id || verifiedUser?.id;
  useEffect(() => {
    if (expired) clearProjectSession(location.pathname);
    else if (verifiedId) {
      if (user?._id !== verifiedId) setUser(verifiedUser);
      if (!signedIn) setProjectSessionItem("loggedIn", "true", location.pathname);
    }
  }, [expired, location.pathname, verifiedId, verifiedUser, user?._id, setUser, signedIn]);

  // Show loading/blank during initial check to prevent 404 flash
  if (session.isPending || (verifiedId && user?._id !== verifiedId && !expired)) {
    return <div className="min-h-screen" />;
  }

  if (session.isError && !expired) {
    return <div role="alert" className="m-8 rounded border p-6"><p>Your session could not be checked. Please try again.</p><button type="button" className="mt-3 rounded border px-3 py-2" onClick={() => void session.refetch()}>Try again</button></div>;
  }

  // If no token, redirect to login
  if (!session.data?.authenticated) {
    const loginPath =
      tenant && project ? buildPath("/login") : PublicRoutes.Login;
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
