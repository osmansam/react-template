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
import { useWebSocket } from "./hooks/useWebSocket";
import RouterContainer from "./navigation/routes";

function AppContent() {
  const location = useLocation();
  const { isSidebarOpen } = useGeneralContext();
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

  return (
    <>
      {/* {isMutating ? <Loading /> : null} */}
      {showSidebar && <Sidebar />}
      <div
        className={`transition-all duration-300 ease-in-out ${
          showSidebar ? (isSidebarOpen ? "lg:ml-64" : "lg:ml-16") : ""
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

function App() {
  return (
    <div className="App">
      <UserContextProvider>
        <GeneralContextProvider>
          <AppContent />
        </GeneralContextProvider>
      </UserContextProvider>
    </div>
  );
}

// Create QueryClient once outside component to prevent recreation
const queryClient = new QueryClient();

// We are wrapping the App component to be able to use isMutating hooks in it
function Wrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default Wrapper;
