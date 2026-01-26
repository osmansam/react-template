import { useEffect, useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { useDynamicPages } from "../hooks/useDynamicPages";
import GoogleCallback from "../pages/GoogleCallback";
import Login from "../pages/Login";
import { allRoutes, PublicRoutes } from "./constants";
import { PrivateRoutes } from "./PrivateRoutes";

interface RouteConfig {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  icon?: string;
  element?: () => JSX.Element;
  children?: RouteConfig[];
  link?: string;
}

const RouterContainer = () => {
  const { dynamicRoutes } = useDynamicPages();
  const [isReady, setIsReady] = useState(false);

  // Combine static routes with dynamic routes
  const combinedRoutes = useMemo(() => {
    return [...allRoutes, ...dynamicRoutes];
  }, [dynamicRoutes]);

  // Flatten routes to include children
  const flattenedRoutes = useMemo(() => {
    const routes: RouteConfig[] = [];
    combinedRoutes.forEach((route) => {
      if (route.children) {
        // Add all children routes
        route.children.forEach((child: RouteConfig) => {
          if (child.path) {
            routes.push(child);
          }
        });
      } else if (route.path) {
        // Add route if it has a path
        routes.push(route);
      }
    });
    return routes;
  }, [combinedRoutes]);

  // Wait for initial setup to prevent 404 flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Show blank screen during initial load to prevent 404 flash
  if (!isReady) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <Routes>
      {/* Tenant/Project scoped routes - ALL routes including login */}
      <Route path="/t/:tenant/p/:project">
        <Route path="login" element={<Login />} />
        <Route path="auth/google/callback" element={<GoogleCallback />} />

        {/* Private routes */}
        <Route element={<PrivateRoutes />}>
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
