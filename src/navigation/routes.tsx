import { Route, Routes } from "react-router-dom";
import GenericPaginatedPage from "../components/panelComponents/FormElements/GenericPaginatedPage";
import { allRoutes, PublicRoutes } from "./constants";
import { PrivateRoutes } from "./PrivateRoutes";

const RouterContainer = () => {
  console.log("allRoutes", allRoutes);
  return (
    <Routes>
      {allRoutes.map((route) => (
        <Route key={route.name} element={<PrivateRoutes />}>
          {allRoutes?.map((route) => (
            <Route
              key={route.name}
              path={route.path}
              element={route.element && <route.element />}
            />
          ))}
        </Route>
      ))}

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
