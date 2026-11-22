import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { useTenantProject } from "../hooks/useTenantProject";
import { User } from "../types";
import { getProjectSessionItem, removeProjectSessionItem, setProjectSessionItem, subscribeProjectSession } from "../utils/projectSessionStorage";

type UserContextType = { user?: User; signedIn?: boolean; setUser: (user?: User) => void };
const UserContext = createContext<UserContextType>({ setUser: () => undefined });

function parseUser(raw: string | null): User | undefined {
  if (!raw) return;
  try {
    const value = JSON.parse(raw);
    const id = value?._id ?? value?.id;
    if (typeof id === "string" && id.trim()) return { ...value, _id: id };
  } catch { /* Invalid persisted actor. */ }
}

export const UserContextProvider = ({ children }: PropsWithChildren) => {
  const { buildPath } = useTenantProject();
  const pathname = buildPath("/");
  const raw = useSyncExternalStore(subscribeProjectSession, () => getProjectSessionItem("user", pathname));
  const signedIn = useSyncExternalStore(subscribeProjectSession, () => getProjectSessionItem("loggedIn", pathname) === "true");
  const user = useMemo(() => parseUser(raw), [raw]);
  const setUser = useCallback((next?: User) => {
    if (next) setProjectSessionItem("user", JSON.stringify(next), pathname);
    else removeProjectSessionItem("user", pathname);
  }, [pathname]);
  return <UserContext.Provider value={{ user, signedIn, setUser }}>{children}</UserContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUserContext = () => useContext(UserContext);
