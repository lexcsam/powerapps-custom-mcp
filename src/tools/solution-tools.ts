/**
 * Solution Tools — create, list, get, export, import solutions
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as dv from "../api/dataverse.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const CreateSolutionSchema = z.object({
  uniqueName: z.string().describe("Unique solution name (no spaces), e.g. 'ContosoSales'"),
  displayName: z.string().describe("Friendly display name, e.g. 'Contoso Sales Solution'"),
  publisherPrefix: z.string().describe("Publisher prefix to use, e.g. 'contoso'. Must match an existing publisher."),
  version: z.string().optional().describe("Version number, e.g. '1.0.0.0' (default: 1.0.0.0)"),
  description: z.string().optional().describe("Solution description"),
});

const ExportSolutionSchema = z.object({
  solutionUniqueName: z.string().describe("Unique name of the solution to export"),
  managed: z.boolean().optional().describe("Export as managed solution (default: false = unmanaged)"),
});

const ImportSolutionSchema = z.object({
  solutionFileBase64: z.string().describe("Base64-encoded solution zip file content"),
  overwriteUnmanaged: z.boolean().optional().describe("Overwrite unmanaged customizations (default: true)"),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const solutionToolDefinitions = [
  {
    name: "list_solutions",
    description: "List all visible solutions in the current Dataverse environment with their names, versions, and managed status.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "create_solution",
    description:
      "Create a new unmanaged solution in Dataverse. You must specify a publisher prefix that matches " +
      "an existing publisher in the environment.",
    inputSchema: zodToJsonSchema(CreateSolutionSchema),
  },
  {
    name: "export_solution",
    description: "Export a solution as a zip file. Returns the solution content as a base64-encoded string.",
    inputSchema: zodToJsonSchema(ExportSolutionSchema),
  },
  {
    name: "import_solution",
    description: "Import a solution zip file into the current environment. Provide the solution file content as a base64 string.",
    inputSchema: zodToJsonSchema(ImportSolutionSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleSolutionTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "list_solutions": {
        const result = await dv.listSolutions();
        return success(result);
      }
      case "create_solution": {
        const params = CreateSolutionSchema.parse(args);
        const result = await dv.createSolution(params);
        return success({
          message: "Solution created successfully",
          solution: result,
        });
      }
      case "export_solution": {
        const { solutionUniqueName, managed } = ExportSolutionSchema.parse(args);
        const result = await dv.exportSolution(solutionUniqueName, managed);
        return success(result);
      }
      case "import_solution": {
        const { solutionFileBase64, overwriteUnmanaged } = ImportSolutionSchema.parse(args);
        const result = await dv.importSolution(solutionFileBase64, overwriteUnmanaged);
        return success({
          message: "Solution imported successfully",
          result,
        });
      }
      default:
        throw new Error(`Unknown solution tool: ${name}`);
    }
  });
}
