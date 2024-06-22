import { Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import { allRoutes, PublicRoutes } from "./constants";

const RouterContainer = () => {
  return (
    <Routes>
      {allRoutes?.map((route) => (
        <Route key={route.name} path={route.path} element={<route.element />} />
      ))}
      <Route path={PublicRoutes.Login} element={<Login />} />
      <Route path={PublicRoutes.NotFound} element={<Login />} />
    </Routes>
  );
};

export default RouterContainer;
