import { createContext, PropsWithChildren, useContext, useState } from "react";
import { User } from "../types";
import { getProjectSessionItem } from "../utils/projectSessionStorage";

type UserContextType = {
  user?: User;
  setUser: (user?: User) => void;
};

const UserContext = createContext<UserContextType>({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setUser: () => {},
  user: undefined,
});

export const UserContextProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | undefined>(() => {
    const user = getProjectSessionItem("user");
    return user ? JSON.parse(user) : undefined;
  });
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
