/**
 * Dataverse Tools — tables, columns, records CRUD
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as dv from "../api/dataverse.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const CreateTableSchema = z.object({
  schemaName: z.string().describe("Schema name with publisher prefix, e.g. 'new_CustomerOrder'"),
  displayName: z.string().describe("Display name, e.g. 'Customer Order'"),
  pluralName: z.string().describe("Plural display name, e.g. 'Customer Orders'"),
  description: z.string().optional().describe("Table description"),
  primaryAttributeName: z.string().describe("Schema name for the primary name column, e.g. 'new_OrderName'"),
  primaryAttributeDisplayName: z.string().describe("Display name for the primary column, e.g. 'Order Name'"),
  primaryAttributeMaxLength: z.number().optional().describe("Max length for primary column (default: 200)"),
});

const AddColumnSchema = z.object({
  tableName: z.string().describe("Logical name of the table, e.g. 'new_customerorder'"),
  schemaName: z.string().describe("Schema name for the column, e.g. 'new_Quantity'"),
  displayName: z.string().describe("Display name, e.g. 'Quantity'"),
  attributeType: z.enum(["String", "Integer", "Decimal", "Boolean", "DateTime", "Money", "Memo"]).describe("Column data type"),
  maxLength: z.number().optional().describe("Max length (for String type)"),
  required: z.boolean().optional().describe("Whether the field is required (default: false)"),
  description: z.string().optional().describe("Column description"),
});

const DescribeTableSchema = z.object({
  tableName: z.string().describe("Logical name of the table, e.g. 'account' or 'new_customerorder'"),
});

const ListTablesSchema = z.object({
  customOnly: z.boolean().optional().describe("If true, only return custom tables (default: false)"),
});

const CreateRecordSchema = z.object({
  entitySet: z.string().describe("Entity set name (plural), e.g. 'accounts', 'contacts', 'new_customerorders'"),
  data: z.record(z.unknown()).describe("Record data as key-value pairs, e.g. { name: 'Contoso', telephone1: '555-0100' }"),
});

const QueryRecordsSchema = z.object({
  entitySet: z.string().describe("Entity set name (plural), e.g. 'accounts'"),
  select: z.array(z.string()).optional().describe("Columns to return, e.g. ['name', 'telephone1']"),
  filter: z.string().optional().describe("OData filter expression, e.g. \"name eq 'Contoso'\""),
  expand: z.array(z.string()).optional().describe("Related entities to expand"),
  orderby: z.string().optional().describe("Sort order, e.g. 'name asc'"),
  top: z.number().optional().describe("Maximum number of records to return"),
});

const UpdateRecordSchema = z.object({
  entitySet: z.string().describe("Entity set name (plural)"),
  recordId: z.string().describe("GUID of the record to update"),
  data: z.record(z.unknown()).describe("Fields to update"),
});

const DeleteRecordSchema = z.object({
  entitySet: z.string().describe("Entity set name (plural)"),
  recordId: z.string().describe("GUID of the record to delete"),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const dataverseToolDefinitions = [
  {
    name: "create_table",
    description:
      "Create a custom Dataverse table with a primary name column. " +
      "Use add_column afterward to add more columns. The schema name must include a publisher prefix (e.g. 'new_').",
    inputSchema: zodToJsonSchema(CreateTableSchema),
  },
  {
    name: "add_column",
    description: "Add a new column (attribute) to an existing Dataverse table.",
    inputSchema: zodToJsonSchema(AddColumnSchema),
  },
  {
    name: "describe_table",
    description: "Get the full schema of a Dataverse table including all columns, their types, and metadata.",
    inputSchema: zodToJsonSchema(DescribeTableSchema),
  },
  {
    name: "list_tables",
    description: "List all tables in the Dataverse environment. Optionally filter to custom tables only.",
    inputSchema: zodToJsonSchema(ListTablesSchema),
  },
  {
    name: "create_record",
    description: "Create a new record (row) in a Dataverse table. Returns the created record with its ID.",
    inputSchema: zodToJsonSchema(CreateRecordSchema),
  },
  {
    name: "query_records",
    description:
      "Query records from a Dataverse table with OData filters, column selection, sorting, and pagination. " +
      "Use $filter syntax like \"name eq 'Contoso'\" or \"revenue gt 1000000\".",
    inputSchema: zodToJsonSchema(QueryRecordsSchema),
  },
  {
    name: "update_record",
    description: "Update an existing record in a Dataverse table by its GUID.",
    inputSchema: zodToJsonSchema(UpdateRecordSchema),
  },
  {
    name: "delete_record",
    description: "Delete a record from a Dataverse table by its GUID. This action is irreversible.",
    inputSchema: zodToJsonSchema(DeleteRecordSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleDataverseTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "create_table": {
        const params = CreateTableSchema.parse(args);
        const result = await dv.createCustomTable(params);
        return success({ message: "Table created successfully", table: result });
      }
      case "add_column": {
        const params = AddColumnSchema.parse(args);
        const result = await dv.addColumn(params.tableName, {
          schemaName: params.schemaName,
          displayName: params.displayName,
          attributeType: params.attributeType,
          maxLength: params.maxLength,
          required: params.required,
          description: params.description,
        });
        return success({ message: "Column added successfully", column: result });
      }
      case "describe_table": {
        const { tableName } = DescribeTableSchema.parse(args);
        const result = await dv.describeTable(tableName);
        return success(result);
      }
      case "list_tables": {
        const { customOnly } = ListTablesSchema.parse(args);
        const result = await dv.listTables(customOnly ?? false);
        return success(result);
      }
      case "create_record": {
        const { entitySet, data } = CreateRecordSchema.parse(args);
        const result = await dv.createRecord(entitySet, data);
        return success({ message: "Record created successfully", record: result });
      }
      case "query_records": {
        const { entitySet, ...options } = QueryRecordsSchema.parse(args);
        const result = await dv.queryRecords(entitySet, options);
        return success(result);
      }
      case "update_record": {
        const { entitySet, recordId, data } = UpdateRecordSchema.parse(args);
        const result = await dv.updateRecord(entitySet, recordId, data);
        return success({ message: "Record updated successfully", record: result });
      }
      case "delete_record": {
        const { entitySet, recordId } = DeleteRecordSchema.parse(args);
        await dv.deleteRecord(entitySet, recordId);
        return success({ message: `Record ${recordId} deleted successfully` });
      }
      default:
        throw new Error(`Unknown dataverse tool: ${name}`);
    }
  });
}
