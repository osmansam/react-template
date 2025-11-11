import { Route, Routes } from "react-router-dom";
import GenericPaginatedPage from "../pages/GenericPaginatedPage";
import { PublicRoutes } from "./constants";

const RouterContainer = () => {
  return (
    <Routes>
      {/* {allRoutes.map((route) => (
        <Route key={route.name} element={<PrivateRoutes />}>
          {allRoutes?.map((route) => (
            <Route
              key={route.name}
              path={route.path}
              element={route.element && <route.element />}
            />
          ))}
        </Route>
      ))} */}

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
