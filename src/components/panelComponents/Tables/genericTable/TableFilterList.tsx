import { FilterType } from "../../shared/types";

type TableFilterListProps = {
  filters?: FilterType[];
  isUpper: boolean;
};

export const TableFilterList = ({
  filters,
  isUpper,
}: TableFilterListProps) => {
  if (!filters) return null;
  return (
    <>
      {filters.map(
        (filter, index) =>
          filter.isUpperSide === isUpper &&
          !filter.isDisabled && (
            <div key={index} className="flex flex-row gap-2 items-center mr-1">
              {filter.label && (
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {filter.label}
                </span>
              )}
              {filter.node}
            </div>
          ),
      )}
    </>
  );
};
