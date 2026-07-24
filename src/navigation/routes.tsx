import { useMemo } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useDynamicPages } from "../hooks/useDynamicPages";
import GoogleCallback from "../pages/GoogleCallback";
import Login from "../pages/Login";
import { allRoutes, PublicRoutes } from "./constants";
import { getPreferredLandingPath } from "./landingRoute";
import { PrivateRoutes } from "./PrivateRoutes";
import { shouldLoadDynamicPages } from "./dynamicPagesLoading";

interface RouteConfig {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  isMainPage?: boolean;
  icon?: string;
  element?: () => JSX.Element;
  children?: RouteConfig[];
  link?: string;
  tabs?: {
    label: string;
    icon?: string;
  }[];
}

const RouterContainer = () => {
  const location = useLocation();
  const token = localStorage.getItem("jwt");
  const loadDynamicPages = shouldLoadDynamicPages(location.pathname, token);
  const { dynamicRoutes, isLoading, isError } = useDynamicPages(loadDynamicPages);

  // Combine static routes with dynamic routes
  const combinedRoutes = useMemo(() => {
    return [...allRoutes, ...dynamicRoutes];
  }, [dynamicRoutes]);

  // Flatten routes to include children
  const flattenedRoutes = useMemo(() => {
    const routes: RouteConfig[] = [];

    const addRoute = (route: RouteConfig) => {
      if (route.path && route.element) {
        routes.push(route);
      }

      route.children?.forEach(addRoute);
    };

    combinedRoutes.forEach(addRoute);
    return routes;
  }, [combinedRoutes]);

  const landingPath = useMemo(
    () => getPreferredLandingPath(combinedRoutes),
    [combinedRoutes]
  );
  const tenantLandingPath = landingPath.replace(/^\/+/, "") || ".";

  // Show loading screen while fetching dynamic pages to prevent 404 flash
  if (loadDynamicPages && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Loading pages...
      </div>
    );
  }

  if (loadDynamicPages && isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8 text-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold">Pages failed to load</h1>
          <p className="text-gray-600">Refresh the page or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Tenant/Project scoped routes - ALL routes including login */}
      <Route path="/t/:tenant/p/:project">
        <Route path="login" element={<Login />} />
        <Route path="auth/google/callback" element={<GoogleCallback />} />

        {/* Private routes */}
        <Route element={<PrivateRoutes />}>
          <Route
            index
            element={<Navigate to={tenantLandingPath} replace />}
          />
          {flattenedRoutes.map((route) => (
            <Route
              key={route.path}
              path={
                route.path?.startsWith("/") ? route.path.slice(1) : route.path
              }
              element={route.element && <route.element />}
            />
          ))}
          {/* Catch-all for 404 within tenant/project context */}
          <Route
            path="*"
            element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-2">
                  404 - Page Not Found
                </h1>
                <p className="text-gray-600">
                  The page you're looking for doesn't exist.
                </p>
              </div>
            }
          />
        </Route>
      </Route>

      {/* Legacy routes without tenant/project (for backward compatibility) */}
      <Route path={PublicRoutes.Login} element={<Login />} />
      <Route element={<PrivateRoutes />}>
        <Route index element={<Navigate to={landingPath} replace />} />
        {flattenedRoutes.map((route) => (
          <Route
            key={`legacy-${route.path}`}
            path={route.path}
            element={route.element && <route.element />}
          />
        ))}
      </Route>
    </Routes>
  );
};

export default RouterContainer;
