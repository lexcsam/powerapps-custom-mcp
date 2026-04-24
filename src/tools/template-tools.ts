/**
 * Template Tools — list and deploy pre-built app scaffolding templates.
 * Templates define solutions, tables, columns, and sample data.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Built-in Templates ──────────────────────────────────── */

interface TemplateColumn {
  schemaName: string;
  displayName: string;
  type: string;
  maxLength?: number;
  required?: boolean;
}

interface TemplateTable {
  schemaName: string;
  displayName: string;
  pluralName: string;
  primaryColumn: string;
  primaryColumnDisplay: string;
  columns: TemplateColumn[];
}

interface AppTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tables: TemplateTable[];
  sampleRecords: Record<string, Array<Record<string, unknown>>>;
}

const TEMPLATES: AppTemplate[] = [
  {
    id: "expense-tracker",
    name: "Expense Tracker",
    description: "Track employee expenses with categories, approvals, and receipt attachments",
    category: "Business",
    tables: [
      {
        schemaName: "new_Expense",
        displayName: "Expense",
        pluralName: "Expenses",
        primaryColumn: "new_Title",
        primaryColumnDisplay: "Title",
        columns: [
          { schemaName: "new_Amount", displayName: "Amount", type: "Money", required: true },
          { schemaName: "new_Category", displayName: "Category", type: "String", maxLength: 100 },
          { schemaName: "new_DateSubmitted", displayName: "Date Submitted", type: "DateTime" },
          { schemaName: "new_Description", displayName: "Description", type: "Memo" },
          { schemaName: "new_IsApproved", displayName: "Is Approved", type: "Boolean" },
        ],
      },
    ],
    sampleRecords: {
      new_expenses: [
        { new_Title: "Client Lunch", new_Category: "Meals", new_Description: "Lunch with client at downtown restaurant" },
        { new_Title: "Office Supplies", new_Category: "Office", new_Description: "Paper, pens, and notebooks" },
        { new_Title: "Taxi to Airport", new_Category: "Travel", new_Description: "Taxi ride to airport for conference" },
      ],
    },
  },
  {
    id: "inventory-manager",
    name: "Inventory Manager",
    description: "Track products, stock levels, suppliers, and reorder points",
    category: "Operations",
    tables: [
      {
        schemaName: "new_Product",
        displayName: "Product",
        pluralName: "Products",
        primaryColumn: "new_ProductName",
        primaryColumnDisplay: "Product Name",
        columns: [
          { schemaName: "new_SKU", displayName: "SKU", type: "String", maxLength: 50, required: true },
          { schemaName: "new_Quantity", displayName: "Quantity in Stock", type: "Integer" },
          { schemaName: "new_UnitPrice", displayName: "Unit Price", type: "Money" },
          { schemaName: "new_ReorderLevel", displayName: "Reorder Level", type: "Integer" },
          { schemaName: "new_Supplier", displayName: "Supplier", type: "String", maxLength: 200 },
        ],
      },
    ],
    sampleRecords: {
      new_products: [
        { new_ProductName: "Widget A", new_SKU: "WGT-001", new_Supplier: "Acme Corp" },
        { new_ProductName: "Gadget B", new_SKU: "GDG-002", new_Supplier: "TechSupply Inc" },
      ],
    },
  },
  {
    id: "helpdesk-ticketing",
    name: "Helpdesk Ticketing",
    description: "IT helpdesk ticket management with priority, assignment, and resolution tracking",
    category: "IT",
    tables: [
      {
        schemaName: "new_Ticket",
        displayName: "Ticket",
        pluralName: "Tickets",
        primaryColumn: "new_TicketTitle",
        primaryColumnDisplay: "Ticket Title",
        columns: [
          { schemaName: "new_Priority", displayName: "Priority", type: "String", maxLength: 20 },
          { schemaName: "new_Status", displayName: "Status", type: "String", maxLength: 20 },
          { schemaName: "new_AssignedTo", displayName: "Assigned To", type: "String", maxLength: 200 },
          { schemaName: "new_Description", displayName: "Description", type: "Memo" },
          { schemaName: "new_DateOpened", displayName: "Date Opened", type: "DateTime" },
          { schemaName: "new_DateResolved", displayName: "Date Resolved", type: "DateTime" },
        ],
      },
    ],
    sampleRecords: {
      new_tickets: [
        { new_TicketTitle: "Cannot access email", new_Priority: "High", new_Status: "Open", new_AssignedTo: "IT Support" },
        { new_TicketTitle: "Printer not working", new_Priority: "Medium", new_Status: "Open", new_AssignedTo: "IT Support" },
      ],
    },
  },
];

/* ─── Schemas ──────────────────────────────────────────────── */

const DeployTemplateSchema = z.object({
  templateId: z.string().describe("Template ID from list_templates, e.g. 'expense-tracker'"),
  publisherPrefix: z
    .string()
    .optional()
    .describe("Publisher prefix for schema names (default: 'new'). If changed, all table/column schema names will be updated."),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const templateToolDefinitions = [
  {
    name: "list_templates",
    description:
      "List available pre-built app scaffolding templates. " +
      "Templates include Dataverse table definitions, columns, and sample data. " +
      "Use deploy_template to create the tables and data in your environment.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "deploy_template",
    description:
      "Deploy a template to the current Dataverse environment. " +
      "This creates all tables, columns, and optionally sample records defined in the template. " +
      "Use list_templates first to see available template IDs.",
    inputSchema: zodToJsonSchema(DeployTemplateSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleTemplateTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "list_templates": {
        const summary = TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          tables: t.tables.map((tbl) => tbl.displayName),
        }));
        return success(summary);
      }
      case "deploy_template": {
        const { templateId, publisherPrefix } = DeployTemplateSchema.parse(args);
        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) {
          throw new Error(
            `Template '${templateId}' not found. Available templates: ${TEMPLATES.map((t) => t.id).join(", ")}`
          );
        }

        // Import the dataverse module dynamically to avoid circular deps at module init
        const dv = await import("../api/dataverse.js");

        const results: string[] = [];
        const prefix = publisherPrefix ?? "new";

        for (const table of template.tables) {
          const schemaName = table.schemaName.replace(/^new_/, `${prefix}_`);
          const primaryCol = table.primaryColumn.replace(/^new_/, `${prefix}_`);

          try {
            await dv.createCustomTable({
              schemaName,
              displayName: table.displayName,
              pluralName: table.pluralName,
              primaryAttributeName: primaryCol,
              primaryAttributeDisplayName: table.primaryColumnDisplay,
            });
            results.push(`✅ Created table: ${table.displayName}`);

            // Add additional columns
            for (const col of table.columns) {
              const colSchema = col.schemaName.replace(/^new_/, `${prefix}_`);
              try {
                await dv.addColumn(schemaName.toLowerCase(), {
                  schemaName: colSchema,
                  displayName: col.displayName,
                  attributeType: col.type,
                  maxLength: col.maxLength,
                  required: col.required,
                });
                results.push(`  ✅ Added column: ${col.displayName}`);
              } catch (err) {
                results.push(
                  `  ⚠️ Column ${col.displayName}: ${err instanceof Error ? err.message : String(err)}`
                );
              }
            }
          } catch (err) {
            results.push(
              `❌ Table ${table.displayName}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }

        return success({
          message: `Template '${template.name}' deployment completed`,
          results,
          note: "Sample records can be added using the create_record tool with the entity set names from the created tables.",
        });
      }
      default:
        throw new Error(`Unknown template tool: ${name}`);
    }
  });
}
