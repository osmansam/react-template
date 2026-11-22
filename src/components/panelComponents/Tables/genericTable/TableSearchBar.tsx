import { FiSearch } from "react-icons/fi";
import {
  outsideSearch,
  OutsideSearchProps,
} from "../../../../utils/outsideSearch";
import { OrientationToggle } from "../../TabPanel/OrientationToggle";
import { FilterType } from "../../shared/types";
import { TableFilterList } from "./TableFilterList";

type TableSearchBarProps = {
  isSearch: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  searchPlaceholder?: string;
  outsideSearchProps?: OutsideSearchProps;
  showOrientationToggle: boolean;
  tabOrientation: "horizontal" | "vertical";
  setTabOrientation: (orientation: "horizontal" | "vertical") => void;
  hasSelectionActions: boolean;
  isSelectionActive: boolean;
  filters?: FilterType[];
  t: (key: string) => string;
};

export const TableSearchBar = ({
  isSearch,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  searchPlaceholder,
  outsideSearchProps,
  showOrientationToggle,
  tabOrientation,
  setTabOrientation,
  hasSelectionActions,
  isSelectionActive,
  filters,
  t,
}: TableSearchBarProps) => (
  <div className="flex flex-row gap-4 justify-between items-center">
    <div className="flex flex-row gap-3 items-center">
      {isSearch && (
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              searchPlaceholder?.trim() ? searchPlaceholder : t("Search")
            }
            className="h-9 w-56 border border-gray-300 rounded-lg pl-9 pr-8 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg font-light"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      )}
      {outsideSearchProps &&
        outsideSearch({
          ...outsideSearchProps,
          placeholder: searchPlaceholder,
        })}
      {showOrientationToggle && (
        <div className="hidden sm:flex items-center mt-2">
          <OrientationToggle
            orientation={tabOrientation}
            onChange={setTabOrientation}
          />
        </div>
      )}
    </div>
    {!(hasSelectionActions && isSelectionActive) && (
      <div className="hidden sm:flex flex-row flex-wrap gap-4 ml-auto relative z-10">
        <TableFilterList filters={filters} isUpper={true} />
      </div>
    )}
  </div>
);
