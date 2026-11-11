import type { ContainerModel, Field } from "./container";

type LegacyKeys<T> = Partial<T> & {
  [Key in keyof T as Capitalize<Key & string>]?: T[Key];
};
type RawField = Omit<LegacyKeys<Field>, "children" | "Children"> & {
  children?: RawField[];
  Children?: RawField[];
};
type RawContainer = Omit<LegacyKeys<ContainerModel>, "fields" | "Fields"> & {
  ID?: string;
  fields?: RawField[];
  Fields?: RawField[];
};

function normalizeFields(value: unknown): Field[] {
  if (!Array.isArray(value)) return [];
  return value.filter((field): field is RawField =>
    field !== null && typeof field === "object" && !Array.isArray(field),
  ).map(normalizeField);
}

function normalizeField(field: RawField): Field {
  return {
    name: field.name ?? field.Name ?? "",
    type: field.type ?? field.Type ?? "",
    tag: field.tag ?? field.Tag,
    objectSchemaName: field.objectSchemaName ?? field.ObjectSchemaName,
    enumList: field.enumList ?? field.EnumList,
    isForceDelete: field.isForceDelete ?? field.IsForceDelete ?? false,
    unique: field.unique ?? field.Unique ?? false,
    isHashed: field.isHashed ?? field.IsHashed ?? false,
    isLoginCredential: field.isLoginCredential ?? field.IsLoginCredential ?? false,
    isAuditIdentity: field.isAuditIdentity ?? field.IsAuditIdentity ?? false,
    isSearchable: field.isSearchable ?? field.IsSearchable ?? false,
    frontend: field.frontend ?? field.Frontend,
    populationSettings: field.populationSettings ?? field.PopulationSettings,
    equation: field.equation ?? field.Equation,
    isComputed: field.isComputed ?? field.IsComputed,
    authorizeRole: field.authorizeRole ?? field.AuthorizeRole ?? [],
    isAuthorized: field.isAuthorized ?? field.IsAuthorized ?? false,
    order: field.order ?? field.Order,
    children: field.children == null && field.Children == null
      ? undefined : normalizeFields(field.children ?? field.Children),
  };
}

function normalizeContainer(container: RawContainer): ContainerModel {
  return {
    id: container.id ?? container.ID ?? container._id ?? "",
    _id: container._id ?? container.id ?? container.ID,
    schemaName: container.schemaName ?? container.SchemaName ?? "",
    fields: normalizeFields(container.fields ?? container.Fields),
    routes: container.routes ?? container.Routes,
    redis: container.redis ?? container.Redis,
    pipelines: container.pipelines ?? container.Pipelines ?? [],
    workflows: container.workflows ?? container.Workflows ?? [],
    dynamicFunctions: container.dynamicFunctions ?? container.DynamicFunctions ?? [],
    dynamicApis: container.dynamicApis ?? container.DynamicApis ?? [],
    frontend: container.frontend ?? container.Frontend,
    populationArray: container.populationArray ?? container.PopulationArray,
    isAuthContainer: container.isAuthContainer ?? container.IsAuthContainer ?? false,
    isRegisterActive: container.isRegisterActive ?? container.IsRegisterActive ?? false,
    isGoogleLoginActive: container.isGoogleLoginActive ?? container.IsGoogleLoginActive ?? false,
    populatedRoutes: container.populatedRoutes ?? container.PopulatedRoutes ?? [],
    indexes: container.indexes ?? container.Indexes,
    rowAccess: container.rowAccess ?? container.RowAccess,
    tenantId: container.tenantId ?? container.TenantId,
    projectId: container.projectId ?? container.ProjectId,
    collectionName: container.collectionName ?? container.CollectionName,
    createdAt: container.createdAt ?? container.CreatedAt,
    updatedAt: container.updatedAt ?? container.UpdatedAt,
  } as ContainerModel;
}

function unwrap(value: unknown): unknown {
  if (value && typeof value === "object" && "data" in value) {
    return unwrap(value.data);
  }
  return value;
}

export function normalizeContainerResponse(value: unknown): ContainerModel | undefined {
  const data = unwrap(value);
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return normalizeContainer(data as RawContainer);
}

export function normalizeContainersResponse(value: unknown): ContainerModel[] {
  const data = unwrap(value);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeContainerResponse).filter((entry): entry is ContainerModel => entry !== undefined);
}
