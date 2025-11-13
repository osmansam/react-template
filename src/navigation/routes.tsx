import { useMemo } from "react";
import { Route, Routes } from "react-router-dom";
import GenericPaginatedPage from "../components/panelComponents/FormElements/GenericPaginatedPage";
import { useDynamicPages } from "../hooks/useDynamicPages";
import { allRoutes, PublicRoutes } from "./constants";
import { PrivateRoutes } from "./PrivateRoutes";

const RouterContainer = () => {
  const { dynamicRoutes } = useDynamicPages();

  // Combine static routes with dynamic routes
  const combinedRoutes = useMemo(() => {
    return [...allRoutes, ...dynamicRoutes];
  }, [dynamicRoutes]);

  // Flatten routes to include children
  const flattenedRoutes = useMemo(() => {
    const routes: any[] = [];
    combinedRoutes.forEach((route) => {
      if (route.children) {
        // Add all children routes
        route.children.forEach((child: any) => {
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

      <Route
        path={PublicRoutes.Login}
        element={<GenericPaginatedPage schemaName="can" />}
      />
      <Route
        path={PublicRoutes.NotFound}
        element={<GenericPaginatedPage schemaName="can" />}
      />
    </Routes>
  );
};

export default RouterContainer;
