# Explicit Icon Registry Bundle Reduction Design

## Goal

Remove the wildcard `react-icons` imports responsible for approximately 87% of the initial JavaScript bundle while preserving every icon name currently required by application source.

## Root Cause

`src/utils/menuIcons.tsx` imports 20 complete icon packs with namespace imports and spreads every export into one runtime object. Because any exported name can be selected dynamically, Rollup cannot tree-shake unused icons.

The bundle analyzer attributes approximately:

- 27.19 MB raw;
- 7.86 MB gzip;
- 6.50 MB Brotli;

of the 31.31 MB analyzed initial entry to `react-icons`.

## Design

Replace the namespace imports and combined `allIcons` object with named imports and a module-level `Record<string, IconType>` registry.

The registry will contain:

- every Material Design icon used by `getMenuIcon`;
- `FiEdit` and `FiCheck`, used as table action defaults;
- `HiOutlineTrash`, used as the delete-action default;
- `MdSportsEsports`, used by tab fallback behavior;
- `MdSpaceDashboard`, used as the global fallback;
- any other icon name found in repository-owned configuration or tests during implementation.

`getIconByName(iconName)` remains synchronous and retains its existing signature. It returns the matching allowlisted component or `MdSpaceDashboard` for an empty or unsupported name.

`getMenuIcon(menuName)` retains its existing menu-name mappings and fallback behavior.

## Compatibility Boundary

Previously, a backend response could select any icon exported by the 20 imported packs. After this change, backend icon names must be present in the explicit registry. Unsupported names render the existing dashboard fallback rather than failing.

This is an intentional tradeoff: preserving arbitrary access to all icon exports is the behavior that forces the 27 MB payload into the initial bundle. New supported icons can be added with one named import and one registry entry.

## Testing

Add focused unit tests for:

- every icon name required by application defaults resolves to the expected component;
- an unsupported icon name resolves to `MdSpaceDashboard`;
- an empty icon name resolves to `MdSpaceDashboard`;
- representative menu names retain their mapped icons and unknown menu names retain the fallback.

Run the complete existing test suite and ESLint on changed files.

## Bundle Verification

Run both `yarn build` and `yarn analyze` after implementation. Compare the new initial entry with the current analyzed baseline:

- raw: 31,306,503 bytes;
- gzip: 9,039,697 bytes;
- Brotli: 7,495,292 bytes.

Confirm the initial entry no longer includes full icon-pack modules and report the raw, gzip, and Brotli reduction. The ignored `bundle-report.html` remains the analysis artifact.

## Out of Scope

- replacing `react-icons`;
- asynchronously loading full icon packs;
- changing backend page or action schemas;
- optimizing Lodash, Material Tailwind, charts, PDF, spreadsheet, or table code;
- fixing unrelated repository-wide lint errors.
