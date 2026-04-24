/**
 * OData query builder utilities for Dataverse Web API.
 * Constructs properly formatted OData query strings.
 */

export interface ODataQueryOptions {
  select?: string[];
  filter?: string;
  expand?: string[];
  orderby?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

/**
 * Build an OData query string from options.
 */
export function buildODataQuery(options: ODataQueryOptions): string {
  const params: string[] = [];

  if (options.select && options.select.length > 0) {
    params.push(`$select=${options.select.join(",")}`);
  }
  if (options.filter) {
    params.push(`$filter=${options.filter}`);
  }
  if (options.expand && options.expand.length > 0) {
    params.push(`$expand=${options.expand.join(",")}`);
  }
  if (options.orderby) {
    params.push(`$orderby=${options.orderby}`);
  }
  if (options.top !== undefined) {
    params.push(`$top=${options.top}`);
  }
  if (options.skip !== undefined) {
    params.push(`$skip=${options.skip}`);
  }
  if (options.count) {
    params.push("$count=true");
  }

  return params.length > 0 ? `?${params.join("&")}` : "";
}

/**
 * Build an entity set URL for a Dataverse table.
 * Converts logical names to entity set names (basic pluralization).
 */
export function entitySetUrl(
  baseUrl: string,
  entitySetName: string,
  recordId?: string
): string {
  const base = `${baseUrl}/api/data/v9.2/${entitySetName}`;
  if (recordId) {
    return `${base}(${recordId})`;
  }
  return base;
}

/**
 * Parse a Dataverse API response to extract the value array or single entity.
 */
export function parseODataResponse<T>(data: unknown): T[] | T {
  if (typeof data === "object" && data !== null && "value" in data) {
    return (data as { value: T[] }).value;
  }
  return data as T;
}

/**
 * Format a GUID for use in OData URLs (strips curly braces if present).
 */
export function formatGuid(guid: string): string {
  return guid.replace(/[{}]/g, "");
}
