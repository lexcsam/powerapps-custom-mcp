#!/usr/bin/env node

/**
 * PowerApps Custom MCP Server — All-in-One
 *
 * A unified MCP server for Power Platform management:
 * environments, solutions, Dataverse, apps, flows, connectors, security, templates,
 * AND full canvas app authoring (create, edit, coauthor) with .pa.yaml support.
 *
 * Compatible with: GitHub Copilot CLI, Claude Code, Azure AI Foundry, Cursor, VS Code, and any MCP client.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";

// Tool modules — Platform management
import { authToolDefinitions, handleAuthTool } from "./tools/auth-tools.js";
import { environmentToolDefinitions, handleEnvironmentTool } from "./tools/environment-tools.js";
import { solutionToolDefinitions, handleSolutionTool } from "./tools/solution-tools.js";
import { dataverseToolDefinitions, handleDataverseTool } from "./tools/dataverse-tools.js";
import { appToolDefinitions, handleAppTool } from "./tools/app-tools.js";
import { flowToolDefinitions, handleFlowTool } from "./tools/flow-tools.js";
import { connectorToolDefinitions, handleConnectorTool } from "./tools/connector-tools.js";
import { securityToolDefinitions, handleSecurityTool } from "./tools/security-tools.js";
import { templateToolDefinitions, handleTemplateTool } from "./tools/template-tools.js";

// Tool modules — Canvas App authoring
import { canvasAuthoringToolDefinitions, handleCanvasAuthoringTool } from "./tools/canvas-authoring-tools.js";
import { canvasAppToolDefinitions, handleCanvasAppTool } from "./tools/canvas-app-tools.js";

// Resource modules
import {
  canvasResourceDefinitions,
  readCanvasResource,
} from "./resources/canvas-references.js";

/* ─── Tool Registry ────────────────────────────────────────── */

/** All tool definitions aggregated */
const allTools = [
  // Platform management (33 tools)
  ...authToolDefinitions,
  ...environmentToolDefinitions,
  ...solutionToolDefinitions,
  ...dataverseToolDefinitions,
  ...appToolDefinitions,
  ...flowToolDefinitions,
  ...connectorToolDefinitions,
  ...securityToolDefinitions,
  ...templateToolDefinitions,
  // Canvas app authoring (12 tools)
  ...canvasAuthoringToolDefinitions,
  ...canvasAppToolDefinitions,
];

/** Map tool names to their category handlers */
const toolHandlers: Record<
  string,
  (name: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>
> = {};

// Register platform management tools
for (const t of authToolDefinitions) toolHandlers[t.name] = handleAuthTool;
for (const t of environmentToolDefinitions) toolHandlers[t.name] = handleEnvironmentTool;
for (const t of solutionToolDefinitions) toolHandlers[t.name] = handleSolutionTool;
for (const t of dataverseToolDefinitions) toolHandlers[t.name] = handleDataverseTool;
for (const t of appToolDefinitions) toolHandlers[t.name] = handleAppTool;
for (const t of flowToolDefinitions) toolHandlers[t.name] = handleFlowTool;
for (const t of connectorToolDefinitions) toolHandlers[t.name] = handleConnectorTool;
for (const t of securityToolDefinitions) toolHandlers[t.name] = handleSecurityTool;
for (const t of templateToolDefinitions) toolHandlers[t.name] = handleTemplateTool;

// Register canvas authoring tools
for (const t of canvasAuthoringToolDefinitions) toolHandlers[t.name] = handleCanvasAuthoringTool;
for (const t of canvasAppToolDefinitions) toolHandlers[t.name] = handleCanvasAppTool;

/* ─── Server Setup ─────────────────────────────────────────── */

const server = new Server(
  {
    name: "powerapps-custom-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/** Handle ListTools — return all registered tool definitions */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

/** Handle CallTool — route to the appropriate handler */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = toolHandlers[name];

  if (!handler) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Unknown tool '${name}'. Use ListTools to see available tools.`,
        },
      ],
      isError: true,
    };
  }

  return handler(name, (args ?? {}) as Record<string, unknown>);
});

/** Handle ListResources — return canvas reference resources */
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: canvasResourceDefinitions,
}));

/** Handle ReadResource — serve canvas reference content */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return readCanvasResource(uri);
});

/* ─── Start Server ─────────────────────────────────────────── */

async function main(): Promise<void> {
  // Try loading config — graceful failure for configure_auth flow
  try {
    loadConfig();
    console.error(
      `⚡ PowerApps Custom MCP Server v1.0.0 — ${allTools.length} tools loaded (${canvasAuthoringToolDefinitions.length + canvasAppToolDefinitions.length} canvas tools)`
    );
  } catch (err) {
    console.error(
      `⚠️  PowerApps Custom MCP Server started without valid configuration.\n` +
        `   ${allTools.length} tools registered (canvas authoring tools may require additional setup).\n` +
        `   Use the 'configure_auth' tool to set your credentials.\n` +
        `   Use the 'configure_canvas_mcp' tool for canvas app authoring setup.\n` +
        `   Error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
