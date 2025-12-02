// import { Tab } from "../components/panelComponents/shared/types";

import GenericTabPage from "../components/panelComponents/FormElements/GenericTabPage";

// Removed all missing page imports - only keeping existing pages
export enum PublicRoutes {
  NotFound = "*",
  Login = "/login",
  GoogleCallback = "/auth/google/callback",
}

export enum Routes {
  Kest = "/kest",
  Mest = "/mest",
}

// Static/hardcoded routes (you can keep these or move them to dynamic pages)
export const staticRoutes: {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  exceptionalRoles?: number[];
  link?: string;
  icon?: string;
  element?: () => JSX.Element;
  children?: typeof staticRoutes;
}[] = [
  {
    name: "kest",
    path: Routes.Kest,
    element: () => (
      <GenericTabPage
        tabs={[
          { schemaName: "can" },
          { schemaName: "konu" },
          { schemaName: "pi" },
          { schemaName: "furkan" },
          { schemaName: "resim" },
          { schemaName: "obos" },
          { schemaName: "demir" },
          { schemaName: "abc" },
        ]}
      />
    ),
    isOnSidebar: true,
  },
  {
    name: "mest",
    path: Routes.Mest,
    element: () => (
      <GenericTabPage
        tabs={[
          { schemaName: "can" },
          { schemaName: "konu" },
          { schemaName: "pi" },
          { schemaName: "furkan" },
          { schemaName: "resim" },
        ]}
      />
    ),
    isOnSidebar: true,
  },
];

// This will be replaced with dynamic routes
export const allRoutes = staticRoutes;

export const NO_IMAGE_URL =
  "https://res.cloudinary.com/dvbg/image/upload/ar_4:4,c_crop/c_fit,h_100/davinci/no-image_pyet1d.jpg";
