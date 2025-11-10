import { Route, Routes } from "react-router-dom";
import GenericPaginatedPage from "../pages/GenericPaginatedPage";
import { allRoutes, PublicRoutes } from "./constants";

const RouterContainer = () => {
  return (
    <Routes>
      {allRoutes?.map((route) => (
        <Route key={route.name} path={route.path} element={<route.element />} />
      ))}
      <Route
        path={PublicRoutes.Login}
        element={<GenericPaginatedPage schemaName="hilmi" />}
      />
      <Route
        path={PublicRoutes.NotFound}
        element={<GenericPaginatedPage schemaName="hilmi" />}
      />
    </Routes>
  );
};

export default RouterContainer;
