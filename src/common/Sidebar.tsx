import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { IoIosLogOut } from "react-icons/io";
import { useLocation, useNavigate } from "react-router-dom";
// import { useFilteredRoutes } from "../../hooks/useFilteredRoutes";
// import { Role } from "../../types";
import { allRoutes } from "../navigation/constants";
// import { useGetPanelControlPages } from "../../utils/api/panelControl/page";
// import { getMenuIcon } from "../../utils/menuIcons";
import { useGeneralContext } from "../context/General.context";
import SidebarTooltip from "./SidebarTooltip";

export const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isSidebarOpen, setIsSidebarOpen, resetGeneralContext } =
    useGeneralContext();
  // const { setUser } = useUserContext();
  // const user = useGetUser();
  const currentRoute = location.pathname;
  const [openGroups, setOpenGroups] = useState<{ [group: string]: boolean }>(
    {}
  );

  const routes = allRoutes;

  // Commented out since permission filtering is disabled
  // const pages = useGetPanelControlPages();

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  useEffect(() => {
    if (!isSidebarOpen) {
      setOpenGroups({});
    }
  }, [isSidebarOpen]);

  if (
    // !user ||
    routes.length === 0
  ) {
    return null;
  }

  const logout = () => {
    localStorage.clear();
    localStorage.setItem("loggedOut", "true");
    setTimeout(() => localStorage.removeItem("loggedOut"), 500);
    Cookies.remove("jwt");
    // setUser(undefined);
    queryClient.clear();
    navigate("/login");
  };

  return (
    <>
      {isSidebarOpen && (
        <div
          className="hidden lg:block fixed inset-0 bg-black/20 transition-opacity duration-300 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          hidden lg:block fixed top-0 left-0 h-screen border-r border-gray-200
          transition-all duration-300 ease-in-out shadow-lg z-50
          ${isSidebarOpen ? "w-64" : "w-16"}
        `}
      >
        <div
          className={`h-16 bg-gray-800 flex items-center border-b border-gray-700 transition-all duration-200 ${
            isSidebarOpen ? "justify-end pr-4" : "justify-center"
          }`}
        >
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-lg 
              text-white hover:bg-gray-700 transition-all duration-200"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? (
              <FiChevronLeft className="text-2xl" />
            ) : (
              <FiChevronRight className="text-2xl" />
            )}
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-4rem)] py-3 px-2 bg-white overflow-y-auto">
          <div className="flex-1 space-y-1">
            {/* Simplified sidebar - permission roles commented out */}
            {routes.map((route) => {
              if (!route.isOnSidebar) return null;

              return (
                <SidebarTooltip key={route.name} content={t(route.name)}>
                  <button
                    className={`
                    w-full flex items-center gap-2.5 px-2 py-2 rounded-lg
                    text-sm transition-colors
                    ${
                      route.path === currentRoute
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  `}
                    onClick={() => {
                      if (route.path) {
                        resetGeneralContext();
                        navigate(route.path);
                        window.scrollTo(0, 0);
                      }
                    }}
                  >
                    <div
                      className={`flex items-center justify-center flex-shrink-0 ${
                        route.path === currentRoute
                          ? "text-blue-600"
                          : "text-gray-700"
                      }`}
                    >
                      {/* Default icon since getMenuIcon is not available */}
                      <div className="w-5 h-5 bg-gray-400 rounded" />
                    </div>
                    {isSidebarOpen && <span>{t(route.name)}</span>}
                  </button>
                </SidebarTooltip>
              );
            })}

            {/* 
            Original complex permission-based routing logic commented out:
            Complex route filtering with children, permissions, and role-based access
            */}
          </div>

          <div className="border-t border-gray-200 pt-3 mt-3">
            <SidebarTooltip content={t("Logout")}>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg
                text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center justify-center text-red-600 flex-shrink-0">
                  <IoIosLogOut className="text-xl" />
                </div>
                {isSidebarOpen && <span>{t("Logout")}</span>}
              </button>
            </SidebarTooltip>
          </div>
        </div>
      </aside>
    </>
  );
};
