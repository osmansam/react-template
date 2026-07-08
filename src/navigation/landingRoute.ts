export interface LandingRoute {
  name?: string;
  path?: string;
  isOnSidebar?: boolean;
  isMainPage?: boolean;
  children?: LandingRoute[];
}

const collectRoutes = (routes: LandingRoute[]): LandingRoute[] =>
  routes.flatMap((route) => [route, ...collectRoutes(route.children || [])]);

export function getPreferredLandingPath(routes: LandingRoute[]): string {
  const flattenedRoutes = collectRoutes(routes);
  const mainRoute = flattenedRoutes.find((route) => route.isMainPage && route.path);
  const firstRoute = flattenedRoutes.find((route) => route.path);

  return mainRoute?.path || firstRoute?.path || "/";
}
