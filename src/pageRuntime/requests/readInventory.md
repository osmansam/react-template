# Page data-read coverage

| Consumer | Inputs | Shared adapter |
| --- | --- | --- |
| Paginated/all-record tables | `data` | dynamic table-source/list and connected descriptor |
| Charts | `data` | pipeline/workflow or connected result |
| Calendar | `data` | dynamic list or connected record result |
| Info/distribution blocks | `data` | table-source/workflow or connected result |
| Visual repeaters | `collection:<slot>` | page visual collections, with standalone legacy fallback |
| Relation matrix | `rows`, `columns` | paginated schema reads or connected descriptors |
| Grouped tabs | `groupOptions` | selection transport or connected record result |
| Form dropdowns | `options:<formKey>` | shared selection options |
| Table/matrix filter dropdowns | `filterOptions:<id-or-formKey>` | shared selection options |
| Action dropdowns | `actionOptions:<actionId>:<formKey>` | shared selection options |
| Lookup labels | `lookup:<schema>::<match>::<label>` | shared selection options |
| Generated relation columns | `relationOptions:<id>` | shared selection options |

Session identity and schema/page metadata remain prerequisite queries. Static components and sample previews have no dataset reads. Downloads/exports are explicit operations, and create/update/delete, dynamic-array writes and action workflows remain mutation executions. Query scope includes tenant/project/verified actor/page; schema invalidation refreshes matching active variants.
