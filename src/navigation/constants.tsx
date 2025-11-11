// import { Tab } from "../components/panelComponents/shared/types";

import GenericTabPage from "../components/panelComponents/FormElements/GenericTabPage";

// Removed all missing page imports - only keeping existing pages
export enum PublicRoutes {
  NotFound = "*",
  Login = "/login",
}

export enum Routes {
  Test = "/test",
}

export const allRoutes: {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  exceptionalRoles?: number[];
  link?: string;
  element?: () => JSX.Element;
  // tabs?: Tab[];
  children?: typeof allRoutes;
}[] = [
  {
    name: "test",
    path: Routes.Test,
    element: () => (
      <GenericTabPage
        tabs={[
          { schemaName: "can" },
          { schemaName: "konu" },
          { schemaName: "pi" },
          { schemaName: "mustafa" },
        ]}
      />
    ),
    isOnSidebar: true,
  },
];

export const NO_IMAGE_URL =
  "https://res.cloudinary.com/dvbg/image/upload/ar_4:4,c_crop/c_fit,h_100/davinci/no-image_pyet1d.jpg";
