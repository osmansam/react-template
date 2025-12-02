import { useMemo } from "react";
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

  return (
    <Routes>
      <Route element={<PrivateRoutes />}>
        {flattenedRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={route.element && <route.element />}
          />
        ))}
      </Route>

      <Route path={PublicRoutes.Login} element={<Login />} />
      <Route path={PublicRoutes.GoogleCallback} element={<GoogleCallback />} />
  
    </Routes>
  );
};

export default RouterContainer;

