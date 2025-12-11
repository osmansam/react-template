import React from "react";
import { GridCell, GridSection } from "../../types/layout";
import { RenderComponent } from "./PrimitiveComponents";

/**
 * GridCellView - Renders a single grid cell with its components
 */
interface GridCellViewProps {
  cell: GridCell;
}

const GridCellView: React.FC<GridCellViewProps> = ({ cell }) => {
  const { row, column, rowSpan = 1, colSpan = 1, components } = cell;

  // Sort components by order before rendering
  const sortedComponents = [...components].sort((a, b) => a.order - b.order);

  return (
    <div
      className="grid-cell"
      style={{
        gridRow: `${row} / span ${rowSpan}`,
        gridColumn: `${column} / span ${colSpan}`,
      }}
    >
      <div className="flex flex-col gap-4 h-full">
        {sortedComponents.map((component) => (
          <RenderComponent key={component.id} block={component} />
        ))}
      </div>
    </div>
  );
};

/**
 * GridSectionView - Renders a complete grid section
 *
 * This component creates a CSS grid container and renders all cells
 * with proper positioning based on row, column, rowSpan, and colSpan.
 */
interface GridSectionViewProps {
  section: GridSection;
  className?: string;
}

export const GridSectionView: React.FC<GridSectionViewProps> = ({
  section,
  className = "",
}) => {
  const { columns, gap, cells } = section;

  return (
    <div
      className={`grid-section ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        width: "100%",
      }}
    >
      {cells.map((cell) => (
        <GridCellView key={cell.id} cell={cell} />
      ))}
    </div>
  );
};
