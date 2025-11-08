import { Route, Routes } from "react-router-dom";
import CanPage from "../pages/CanPage";
import { allRoutes, PublicRoutes } from "./constants";

const RouterContainer = () => {
  return (
    <Routes>
      {allRoutes?.map((route) => (
        <Route key={route.name} path={route.path} element={<route.element />} />
      ))}
      <Route path={PublicRoutes.Login} element={<CanPage />} />
      <Route path={PublicRoutes.NotFound} element={<CanPage />} />
    </Routes>
  );
};

export default RouterContainer;
