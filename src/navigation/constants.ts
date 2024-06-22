export enum PublicRoutes {
  NotFound = "*",
  Login = "/login",
}

export enum Routes {}

export const allRoutes: {
  name: string;
  path: string;
  isOnSidebar: boolean;
  element: () => JSX.Element;
}[] = [];
