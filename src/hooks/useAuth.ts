import { getDynamicPagesAuthFailureRedirect } from "../navigation/dynamicPagesLoading";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserContext } from "../context/User.context";
import { PublicRoutes } from "../navigation/constants";
import { axiosClient } from "../utils/api/axiosClient";
import { useTenantProject } from "./useTenantProject";
import { projectSessionStorageKey } from "../utils/projectSessionStorage";
// import { getUserWithToken } from "../utils/api/user";

const useAuth = () => {
  const { user, setUser } = useUserContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, project, requestConfig, buildPath } = useTenantProject();

  useEffect(() => {
    const controller = new AbortController();
    const getUser = async (): Promise<void> => {
      if (user) return;
      const loginPath =
        tenant && project ? buildPath("/login") : PublicRoutes.Login;

      try {
        const { data } = await axiosClient.get("/auth/session", { signal: controller.signal, ...requestConfig });
        if (controller.signal.aborted) return;
        if (!data?.authenticated) { navigate(loginPath, { replace: true, state: { from: location } }); return; }
        if (data.user) setUser(data.user);
      } catch (error) {
        if (controller.signal.aborted || !getDynamicPagesAuthFailureRedirect(location.pathname, error)) return;
        navigate(loginPath, {
          replace: true,
          state: { from: location },
        });
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === projectSessionStorageKey("loggedOut", location.pathname) && event.newValue === "true") {
        setUser(undefined);
        const loginPath =
          tenant && project ? buildPath("/login") : PublicRoutes.Login;
        navigate(loginPath, {
          replace: true,
        });
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    getUser();
    return () => {
      controller.abort();
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [user, setUser, navigate, location, tenant, project, buildPath, requestConfig]);
  return { setUser };
};

export default useAuth;
