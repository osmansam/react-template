import {
  QueryClient,
  QueryClientProvider,
  useIsMutating,
} from "@tanstack/react-query";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "./common/Loading";
import { Sidebar } from "./common/Sidebar";
import { GeneralContextProvider } from "./context/General.context";
import { UserContextProvider } from "./context/User.context";
import { useWebSocket } from "./hooks/useWebSocket";
import RouterContainer from "./navigation/routes";

function App() {
  const isMutating = useIsMutating();
  useWebSocket();

  return (
    <div className="App">
      <UserContextProvider>
        <GeneralContextProvider>
          {isMutating ? <Loading /> : null}
          <Sidebar />
          <div className="lg:ml-16">
            <RouterContainer />
          </div>
          <ToastContainer
            autoClose={2000}
            hideProgressBar={true}
            transition={Slide}
            closeButton={false}
            position="bottom-right"
          />
        </GeneralContextProvider>
      </UserContextProvider>
    </div>
  );
}

// We are wrapping the App component to be able to use isMutating hooks in it
function Wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default Wrapper;
