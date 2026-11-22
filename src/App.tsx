import { I18nextProvider } from "react-i18next";
import { createProjectTranslations } from "./utils/i18n";
import { useState } from "react";
import { useTenantProject } from "./hooks/useTenantProject";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Sidebar } from "./common/Sidebar";
import {
  GeneralContextProvider,
  useGeneralContext,
} from "./context/General.context";
import { UserContextProvider, useUserContext } from "./context/User.context";
import { baseQueryOptions } from "./config/queryClient";
import { useWebSocket } from "./hooks/useWebSocket";
import RouterContainer from "./navigation/routes";
import { BrandingProvider } from "./context/Branding.context";

function AppContent() {
  const location = useLocation();
  const { isSidebarOpen, isHoverExpanded } = useGeneralContext();
  const { user } = useUserContext();
  useWebSocket();

  // Don't show sidebar on public routes or if user is not authenticated
  // Check for login and auth callback routes (both legacy and multi-tenant paths)
  const isPublicRoute =
    location.pathname.endsWith("/login") ||
    location.pathname === "/login" ||
    location.pathname.includes("/auth/google/callback") ||
    location.pathname === "/auth/google/callback";

  const showSidebar = !isPublicRoute && !!user;
  const isSidebarExpanded = isSidebarOpen || isHoverExpanded;

  return (
    <>
      {/* {isMutating ? <Loading /> : null} */}
      {showSidebar && <Sidebar />}
      <div
        className={`transition-[margin-left] duration-200 ease-out ${
          showSidebar ? (isSidebarExpanded ? "lg:ml-64" : "lg:ml-16") : ""
        }`}
      >
        <RouterContainer />
      </div>
      <ToastContainer
        autoClose={2000}
        hideProgressBar={true}
        transition={Slide}
        closeButton={false}
        position="bottom-right"
      />
    </>
  );
}

function ProjectApp() {
  const [translations] = useState(createProjectTranslations);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: baseQueryOptions } }));
  return (
    <div className="App">
      <I18nextProvider i18n={translations}>
        <QueryClientProvider client={client}>
          <GeneralContextProvider>
            <BrandingProvider>
              <AppContent />
            </BrandingProvider>
          </GeneralContextProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </div>
  );
}

function ScopedApp() {
  const { tenant, project, requestConfig } = useTenantProject();
  const { user, signedIn } = useUserContext();
  // The revision retires cache even when a batched sign-out/sign-in returns to
  // the same tenant, actor, and signed-in state.
  return (
    <ProjectApp
      key={JSON.stringify([
        tenant,
        project,
        user?._id,
        signedIn,
        requestConfig.runtimeSession,
      ])}
    />
  );
}

export default function App() {
  return <UserContextProvider><ScopedApp /></UserContextProvider>;
}
