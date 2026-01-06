import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserContext } from "../context/User.context";
import { PublicRoutes } from "../navigation/constants";
import { ACCESS_TOKEN } from "../utils/api/axiosClient";
import { validateTokenForTenantProject } from "../utils/jwtUtils";
import { useTenantProject } from "./useTenantProject";
// import { getUserWithToken } from "../utils/api/user";

const useAuth = () => {
  const { user, setUser } = useUserContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, project, buildPath } = useTenantProject();

  useEffect(() => {
    const getUser = async (): Promise<void> => {
      if (user) return;
      const token = localStorage.getItem(ACCESS_TOKEN);

      const loginPath =
        tenant && project ? buildPath("/login") : PublicRoutes.Login;

      if (!token) {
        navigate(loginPath, {
          replace: true,
          state: { from: location },
        });
        return;
      }

      // Validate token for tenant/project if they exist in URL
      if (tenant && project) {
        const isValid = validateTokenForTenantProject(token, tenant, project);
        if (!isValid) {
          localStorage.removeItem(ACCESS_TOKEN);
          navigate(loginPath, {
            replace: true,
            state: { from: location },
          });
          return;
        }
      }

      try {
        // const loggedInUser = await getUserWithToken();
        // setUser(loggedInUser);
      } catch (e) {
        console.log(e);
        navigate(loginPath, {
          replace: true,
          state: { from: location },
        });
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "loggedOut" && event.newValue === "true") {
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
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [user, setUser, navigate, location, tenant, project, buildPath]);
  return { setUser };
};

export default useAuth;
