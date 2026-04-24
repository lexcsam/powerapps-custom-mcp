/**
 * Canvas Authoring Tools — 8 proxy tools wrapping the .NET CanvasAuthoringMcpServer
 *
 * These tools forward calls to the .NET MCP server which communicates with
 * a live Power Apps Studio coauthoring session. The Studio browser tab must
 * remain open for the duration of the session.
 *
 * Tools:
 *   canvas_compile           — Validate .pa.yaml files
 *   canvas_describe_api      — Get connector details
 *   canvas_describe_control  — Get control properties and variants
 *   canvas_get_data_source_schema — Get data source columns & types
 *   canvas_list_apis         — List all available connectors
 *   canvas_list_controls     — List all available controls
 *   canvas_list_data_sources — List all available data sources
 *   canvas_sync              — Sync coauthoring session to local YAML
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  callCanvasTool,
  isCanvasConfigured,
} from "../canvas/canvas-proxy.js";
import {
  success,
  withErrorHandling,
  type McpToolResult,
} from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const CompileCanvasSchema = z.object({
  directory: z
    .string()
    .describe("Absolute path to the directory containing .pa.yaml files to validate"),
});

const DescribeApiSchema = z.object({
  apiName: z
    .string()
    .describe("The name/identifier of the API (connector) to describe"),
});

const DescribeControlSchema = z.object({
  controlName: z
    .string()
    .describe("The name of the Power Apps control to describe (e.g., 'Button', 'ModernCard', 'Gallery')"),
});

const GetDataSourceSchemaSchema = z.object({
  dataSourceName: z
    .string()
    .describe("The name of the data source to get the schema for"),
});

const EmptySchema = z.object({});

const SyncCanvasSchema = z.object({
  directory: z
    .string()
    .describe("Absolute path to the directory to sync .pa.yaml files into"),
});

/* ─── Helper ───────────────────────────────────────────────── */

function checkConfigured(): void {
  if (!isCanvasConfigured()) {
    throw new Error(
      "Canvas authoring is not configured.\n\n" +
        "Required environment variables:\n" +
        "  • CANVAS_ENVIRONMENT_ID — Your Power Platform environment ID\n" +
        "  • CANVAS_APP_ID — Your canvas app ID\n" +
        "  • CANVAS_CLUSTER_CATEGORY — 'prod' or 'test' (default: prod)\n\n" +
        "Use the 'configure_canvas_mcp' tool for step-by-step setup instructions.\n\n" +
        "Prerequisites:\n" +
        "  • .NET 10 SDK (https://dotnet.microsoft.com/download/dotnet/10.0)\n" +
        "  • Power Apps Studio session open with coauthoring enabled"
    );
  }
}

/* ─── Tool Definitions ─────────────────────────────────────── */

export const canvasAuthoringToolDefinitions = [
  {
    name: "canvas_compile",
    description:
      "Validate canvas app YAML files (.pa.yaml) in a directory using the Power Apps authoring service. " +
      "Returns compilation errors with file names and line numbers. " +
      "Requires a live Power Apps Studio coauthoring session.",
    inputSchema: zodToJsonSchema(CompileCanvasSchema),
  },
  {
    name: "canvas_describe_api",
    description:
      "Get detailed information about a specific API (connector) including its operations, " +
      "parameters, and return types. Use after canvas_list_apis to inspect a specific connector.",
    inputSchema: zodToJsonSchema(DescribeApiSchema),
  },
  {
    name: "canvas_describe_control",
    description:
      "Get detailed information about a specific Power Apps control including all properties, " +
      "variants, and metadata. ALWAYS call this before using a control to verify correct property names. " +
      "Use after canvas_list_controls to inspect a specific control type.",
    inputSchema: zodToJsonSchema(DescribeControlSchema),
  },
  {
    name: "canvas_get_data_source_schema",
    description:
      "Get the schema (columns and their Power Fx types) for a specific data source " +
      "in the current authoring session. Use after canvas_list_data_sources.",
    inputSchema: zodToJsonSchema(GetDataSourceSchemaSchema),
  },
  {
    name: "canvas_list_apis",
    description:
      "List all available APIs (connectors) in the current Power Apps authoring session. " +
      "Returns connector names and descriptions. Use canvas_describe_api for details on a specific connector.",
    inputSchema: zodToJsonSchema(EmptySchema),
  },
  {
    name: "canvas_list_controls",
    description:
      "List all available Power Apps controls in the current authoring session. " +
      "⚠️ ALWAYS call this FIRST before designing any canvas app screen — controls you don't know " +
      "exist can't influence your design. Includes modern controls like ModernCard, Avatar, Badge, Progress, etc.",
    inputSchema: zodToJsonSchema(EmptySchema),
  },
  {
    name: "canvas_list_data_sources",
    description:
      "List all available data sources in the current Power Apps authoring session. " +
      "Returns data source names and types. Use canvas_get_data_source_schema for column details.",
    inputSchema: zodToJsonSchema(EmptySchema),
  },
  {
    name: "canvas_sync",
    description:
      "Sync the current coauthoring session state from the Power Apps server to a local directory, " +
      "writing all .pa.yaml files. Use before editing an existing canvas app to get the current state. " +
      "The Studio browser tab must remain open.",
    inputSchema: zodToJsonSchema(SyncCanvasSchema),
  },
];

/* ─── Name Mapping ─────────────────────────────────────────── */

/** Map our tool names to the .NET MCP server's tool names */
const TOOL_NAME_MAP: Record<string, string> = {
  canvas_compile: "compile_canvas",
  canvas_describe_api: "describe_api",
  canvas_describe_control: "describe_control",
  canvas_get_data_source_schema: "get_data_source_schema",
  canvas_list_apis: "list_apis",
  canvas_list_controls: "list_controls",
  canvas_list_data_sources: "list_data_sources",
  canvas_sync: "sync_canvas",
};

/** Map our arg names to the .NET server's expected arg names */
function mapArgs(
  toolName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  switch (toolName) {
    case "canvas_compile":
      return { directory: args.directory };
    case "canvas_describe_api":
      return { apiName: args.apiName };
    case "canvas_describe_control":
      return { controlName: args.controlName };
    case "canvas_get_data_source_schema":
      return { dataSourceName: args.dataSourceName };
    case "canvas_sync":
      return { directory: args.directory };
    default:
      return args;
  }
}

/* ─── Handler ──────────────────────────────────────────────── */

export async function handleCanvasAuthoringTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    checkConfigured();

    const dotnetToolName = TOOL_NAME_MAP[name];
    if (!dotnetToolName) {
      throw new Error(`Unknown canvas authoring tool: ${name}`);
    }

    // Parse and validate args based on tool
    let validatedArgs: Record<string, unknown> = {};
    switch (name) {
      case "canvas_compile":
        validatedArgs = CompileCanvasSchema.parse(args);
        break;
      case "canvas_describe_api":
        validatedArgs = DescribeApiSchema.parse(args);
        break;
      case "canvas_describe_control":
        validatedArgs = DescribeControlSchema.parse(args);
        break;
      case "canvas_get_data_source_schema":
        validatedArgs = GetDataSourceSchemaSchema.parse(args);
        break;
      case "canvas_list_apis":
      case "canvas_list_controls":
      case "canvas_list_data_sources":
        validatedArgs = {};
        break;
      case "canvas_sync":
        validatedArgs = SyncCanvasSchema.parse(args);
        break;
    }

    const mappedArgs = mapArgs(name, validatedArgs);
    const result = await callCanvasTool(dotnetToolName, mappedArgs);
    return success(result);
  });
}
