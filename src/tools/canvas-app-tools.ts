/**
 * Canvas App Orchestration Tools — generate, edit, add data source, configure
 *
 * These are high-level tools that return structured multi-phase plans/instructions
 * for creating and modifying Canvas Apps. The AI client follows the returned plan
 * to orchestrate the workflow using the canvas_* authoring tools.
 *
 * Tools:
 *   generate_canvas_app     — Generate a complete canvas app from natural language
 *   edit_canvas_app         — Edit an existing canvas app
 *   add_canvas_data_source  — Guide user to add a data source in Studio
 *   configure_canvas_mcp    — Setup instructions for the CanvasAuthoringMcpServer
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const GenerateCanvasAppSchema = z.object({
  description: z
    .string()
    .describe(
      "Natural language description of the canvas app to generate. " +
      "E.g., 'An expense tracker app with submission form, approval workflow, and dashboard'"
    ),
  targetDevice: z
    .enum(["desktop", "tablet", "phone", "responsive"])
    .optional()
    .describe("Target device (default: responsive). Influences layout strategy."),
  aesthetic: z
    .string()
    .optional()
    .describe(
      "Aesthetic direction, e.g., 'Clean & Professional', 'Bold & High-Contrast', " +
      "'Soft & Approachable', 'Dense & Utilitarian'"
    ),
  workingDirectory: z
    .string()
    .optional()
    .describe("Absolute path to create the app folder in (default: current directory)"),
});

const EditCanvasAppSchema = z.object({
  description: z
    .string()
    .describe(
      "Natural language description of changes to make. " +
      "E.g., 'Add a settings screen with dark mode toggle and notification preferences'"
    ),
  workingDirectory: z
    .string()
    .describe("Absolute path to the directory containing the app's .pa.yaml files"),
});

const AddDataSourceSchema = z.object({
  dataSourceType: z
    .string()
    .describe(
      "Type of data source or connector to add. " +
      "E.g., 'SharePoint', 'Dataverse', 'SQL Server', 'Excel', 'Office 365 Users', 'Teams'"
    ),
  details: z
    .string()
    .optional()
    .describe("Additional details like table name, list name, or connection string"),
});

const ConfigureCanvasMcpSchema = z.object({
  toolType: z
    .enum(["claude", "vscode-copilot", "copilot"])
    .describe("Which tool to configure the Canvas Authoring MCP server for"),
  studioUrl: z
    .string()
    .describe(
      "The URL from the Power Apps Studio browser address bar. " +
      "Should look like: https://make.powerapps.com/e/Default-xxx/canvas/?action=edit&app-id=..."
    ),
  scope: z
    .string()
    .optional()
    .describe(
      "Configuration scope. For Claude: 'user', 'project', or 'local'. " +
      "For Copilot: 'global' or 'project'. Not applicable for VS Code."
    ),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const canvasAppToolDefinitions = [
  {
    name: "generate_canvas_app",
    description:
      "Generate a complete Power Apps Canvas App from a natural language description. " +
      "Returns a multi-phase plan: folder setup → design preferences → screen planning → " +
      "parallel screen building → validation → summary. " +
      "Uses canvas_list_controls, canvas_describe_control, canvas_compile, and other canvas authoring tools. " +
      "Requires a live Power Apps Studio coauthoring session.",
    inputSchema: zodToJsonSchema(GenerateCanvasAppSchema),
  },
  {
    name: "edit_canvas_app",
    description:
      "Edit an existing Power Apps Canvas App from a natural language description of changes. " +
      "First syncs the current app state using canvas_sync, then either applies simple inline edits " +
      "(≤2 controls, 1 screen) or orchestrates a complex multi-screen edit plan. " +
      "Validates with canvas_compile after all changes.",
    inputSchema: zodToJsonSchema(EditCanvasAppSchema),
  },
  {
    name: "add_canvas_data_source",
    description:
      "Guide the user to add a data source, connection, or API connector to a Canvas App " +
      "via Power Apps Studio. Data sources cannot be added programmatically — the user must " +
      "add them through the Studio interface. This tool provides step-by-step instructions " +
      "and then verifies the connection using canvas_list_data_sources or canvas_list_apis.",
    inputSchema: zodToJsonSchema(AddDataSourceSchema),
  },
  {
    name: "configure_canvas_mcp",
    description:
      "Configure the Canvas Authoring MCP server for Claude Code, VS Code Copilot, or " +
      "GitHub Copilot CLI. Extracts environment ID, app ID, and cluster category from the " +
      "Studio URL and provides exact configuration commands/JSON to register the server.",
    inputSchema: zodToJsonSchema(ConfigureCanvasMcpSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleCanvasAppTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "generate_canvas_app":
        return handleGenerateCanvasApp(args);
      case "edit_canvas_app":
        return handleEditCanvasApp(args);
      case "add_canvas_data_source":
        return handleAddDataSource(args);
      case "configure_canvas_mcp":
        return handleConfigureCanvasMcp(args);
      default:
        throw new Error(`Unknown canvas app tool: ${name}`);
    }
  });
}

/* ─── Generate Canvas App ──────────────────────────────────── */

function handleGenerateCanvasApp(
  args: Record<string, unknown>
): McpToolResult {
  const parsed = GenerateCanvasAppSchema.parse(args);
  const device = parsed.targetDevice ?? "responsive";
  const aesthetic = parsed.aesthetic ?? "Clean & Professional";

  const layoutStrategy =
    device === "desktop"
      ? "ManualLayout (pixel-perfect)"
      : "AutoLayout (responsive — GroupContainer with Vertical/Horizontal variants)";

  const plan = {
    workflow: "generate-canvas-app",
    phases: [
      {
        phase: 0,
        name: "Create App Folder",
        description:
          "Create a working directory for the app's .pa.yaml files.",
        actions: [
          `Derive folder name from: "${parsed.description}"`,
          "Convert to kebab-case (e.g., 'expense-tracker')",
          `Create folder${parsed.workingDirectory ? ` in ${parsed.workingDirectory}` : ""}`,
          "Resolve absolute path — this is the working directory for all subsequent phases",
        ],
      },
      {
        phase: 1,
        name: "Discover Resources",
        description:
          "Discover available controls, APIs, and data sources before designing.",
        actions: [
          "Call canvas_list_controls — MANDATORY before any design decisions",
          "Call canvas_list_apis — discover available connectors",
          "Call canvas_list_data_sources — discover connected data sources",
          "For relevant connectors: call canvas_describe_api for each",
          "For relevant data sources: call canvas_get_data_source_schema for each",
        ],
      },
      {
        phase: 2,
        name: "Design & Plan",
        description: "Design the app screens and present plan for approval.",
        designPreferences: {
          targetDevice: device,
          layoutStrategy,
          aesthetic,
          requirements: parsed.description,
        },
        actions: [
          "Read references/TechnicalGuide.md for YAML syntax rules",
          "Read references/DesignGuide.md for aesthetic guidelines",
          "Determine number of screens and purpose of each",
          "Select controls for each screen based on discovery results",
          "Define color palette with exact RGBA values",
          "Define state variables and data flow",
          "Present screen plan to user for approval",
          "After approval, call canvas_describe_control for every control type in the design",
        ],
      },
      {
        phase: 3,
        name: "Build Screens",
        description:
          "Write .pa.yaml files for App.pa.yaml and each screen.",
        actions: [
          "Write App.pa.yaml with app-level properties (StartScreen, Formulas)",
          "Write one .pa.yaml file per screen following the approved plan",
          "Follow TechnicalGuide.md conventions strictly",
          "Use exact property names from canvas_describe_control results",
          "Screens can be written in parallel",
        ],
      },
      {
        phase: 4,
        name: "Validate & Fix",
        description:
          "Compile and iterate until all files pass validation.",
        actions: [
          "Call canvas_compile on the working directory",
          "On failure: read errors, fix .pa.yaml files, re-compile",
          "Iterate until canvas_compile reports no errors",
          "Track number of compilation passes needed",
        ],
      },
      {
        phase: 5,
        name: "Summary",
        description: "Present final summary of generated app.",
        actions: [
          "List all screens with file names and status",
          "Report compilation result and number of passes",
          "Suggest next steps (e.g., add data sources, publish)",
        ],
      },
    ],
    criticalRules: [
      "ALWAYS run canvas_list_controls before designing — non-optional",
      "ALWAYS call canvas_describe_control for every control type used — never guess property names",
      "Use ModernCard for clickable cards (GroupContainer has no OnSelect)",
      "Use |- for multi-line formulas, = prefix on the first content line",
      "Quote Power Fx record literals in YAML strings",
      "Validate early and often with canvas_compile",
      `Default layout strategy: ${layoutStrategy}`,
    ],
  };

  return success(plan);
}

/* ─── Edit Canvas App ──────────────────────────────────────── */

function handleEditCanvasApp(
  args: Record<string, unknown>
): McpToolResult {
  const parsed = EditCanvasAppSchema.parse(args);

  const plan = {
    workflow: "edit-canvas-app",
    phases: [
      {
        phase: 0,
        name: "Sync Current State",
        description:
          "Sync the canvas app's current state from the coauthoring session.",
        actions: [
          `Call canvas_sync with directory: "${parsed.workingDirectory}"`,
          "Read all synced .pa.yaml files",
          "Check if app has meaningful content (screens with controls)",
          "If empty: switch to generate_canvas_app workflow instead",
        ],
      },
      {
        phase: 1,
        name: "Assess Complexity",
        description: "Determine if this is a simple or complex edit.",
        editRequest: parsed.description,
        simpleEditCriteria: [
          "Changes affect ≤ 2 controls or properties",
          "Changes confined to ≤ 1 screen",
          "No new screens being added",
          "No new data sources or connectors needed",
          "No structural layout changes",
        ],
        complexEditCriteria: [
          "Changes span multiple screens",
          "New screens need to be created",
          "New data sources or connectors required",
          "Structural layout changes involved",
          "Significant visual redesign",
        ],
      },
      {
        phase: 2,
        name: "Apply Changes",
        description:
          "Apply edits directly (simple) or plan & orchestrate (complex).",
        simplePath: {
          actions: [
            "Read references/TechnicalGuide.md for syntax conventions",
            "Edit the relevant .pa.yaml files directly",
            "Call canvas_compile to validate",
            "Fix any errors and re-compile until clean",
          ],
        },
        complexPath: {
          actions: [
            "Read both TechnicalGuide.md and DesignGuide.md",
            "Call canvas_list_controls to discover available controls",
            "Call canvas_describe_control for any new control types",
            "Plan edits across all affected screens",
            "Write/modify .pa.yaml files (can parallelize across screens)",
            "Call canvas_compile to validate all changes",
            "Fix errors and iterate until clean",
          ],
        },
      },
      {
        phase: 3,
        name: "Summary",
        actions: [
          "List all modified/added screens with file names",
          "Report compilation result and number of passes",
        ],
      },
    ],
  };

  return success(plan);
}

/* ─── Add Data Source ───────────────────────────────────────── */

function handleAddDataSource(
  args: Record<string, unknown>
): McpToolResult {
  const parsed = AddDataSourceSchema.parse(args);

  const isApi = [
    "office 365",
    "teams",
    "custom connector",
    "api",
    "connector",
  ].some((keyword) =>
    parsed.dataSourceType.toLowerCase().includes(keyword)
  );

  const verifyWith = isApi
    ? "canvas_list_apis + canvas_describe_api"
    : "canvas_list_data_sources + canvas_get_data_source_schema";

  const plan = {
    workflow: "add-canvas-data-source",
    dataSourceType: parsed.dataSourceType,
    details: parsed.details,
    phases: [
      {
        phase: 1,
        name: "Inform User",
        description:
          "Data sources/connectors cannot be added programmatically. The user must add them in Power Apps Studio.",
        userInstructions: [
          "Open the Data panel in the left sidebar of Power Apps Studio",
          "Click 'Add data'",
          `Search for "${parsed.dataSourceType}"`,
          "Follow authentication prompts",
          `${parsed.details ? `Select: ${parsed.details}` : "Select the specific table, list, file, or dataset"}`,
          "The connection will then be available to the MCP server",
        ],
      },
      {
        phase: 2,
        name: "Wait for Confirmation",
        description:
          "Ask the user to confirm they have completed the steps in Studio.",
        prompt:
          "Please add the data source in your Power Apps Studio session. Reply when it's ready and I'll verify the connection.",
      },
      {
        phase: 3,
        name: "Verify Connection",
        description: `After user confirms, verify using: ${verifyWith}`,
        actions: [
          isApi
            ? "Call canvas_list_apis to check if the connector is visible"
            : "Call canvas_list_data_sources to check if the data source is visible",
          "If found: confirm to user with the exact name (needed for Power Fx formulas)",
          isApi
            ? "If found: call canvas_describe_api for operation details"
            : "If found: call canvas_get_data_source_schema for column details",
          "If not found: ask user to check Studio steps and retry",
        ],
      },
      {
        phase: 4,
        name: "Continue",
        description:
          "After verification, proceed with any pending work that needed this data source.",
      },
    ],
  };

  return success(plan);
}

/* ─── Configure Canvas MCP ─────────────────────────────────── */

function handleConfigureCanvasMcp(
  args: Record<string, unknown>
): McpToolResult {
  const parsed = ConfigureCanvasMcpSchema.parse(args);

  // Parse the Studio URL to extract environment ID, app ID, cluster category
  let envId = "";
  let appId = "";
  let clusterCategory = "prod";

  try {
    const url = new URL(parsed.studioUrl);
    const hostname = url.hostname;

    // Extract ENV_ID: segment between /e/ and next /
    const envMatch = url.pathname.match(/\/e\/([^/]+)/);
    if (envMatch) {
      envId = envMatch[1];
    }

    // Extract APP_ID: URL-decode app-id query param, take last segment after /
    const appIdParam = url.searchParams.get("app-id");
    if (appIdParam) {
      const decoded = decodeURIComponent(appIdParam);
      const lastSegment = decoded.split("/").pop();
      if (lastSegment) {
        appId = lastSegment;
      }
    }

    // Determine cluster category
    clusterCategory =
      hostname === "make.powerapps.com" ||
      hostname === "make.preview.powerapps.com"
        ? "prod"
        : "test";
  } catch {
    throw new Error(
      `Invalid Studio URL: "${parsed.studioUrl}". ` +
        "Expected format: https://make.powerapps.com/e/Default-xxx/canvas/?action=edit&app-id=..."
    );
  }

  if (!envId || !appId) {
    throw new Error(
      "Could not extract environment ID and app ID from the Studio URL. " +
        "Make sure the URL contains /e/{environmentId}/ and app-id= query parameter."
    );
  }

  const scope = parsed.scope ?? (parsed.toolType === "claude" ? "project" : "global");

  // Build configuration instructions based on tool type
  let instructions: unknown;

  if (parsed.toolType === "claude") {
    instructions = {
      tool: "Claude Code",
      prerequisite: ".NET 10 SDK (https://dotnet.microsoft.com/download/dotnet/10.0)",
      steps: [
        {
          step: 1,
          description: "Register the MCP server",
          command: [
            `claude mcp add --scope ${scope} canvas-authoring`,
            `-e CANVAS_ENVIRONMENT_ID=${envId}`,
            `-e CANVAS_APP_ID=${appId}`,
            `-e CANVAS_CLUSTER_CATEGORY=${clusterCategory}`,
            "-- dnx Microsoft.PowerApps.CanvasAuthoring.McpServer --yes --prerelease --source https://api.nuget.org/v3/index.json",
          ].join(" \\\n  "),
        },
        {
          step: 2,
          description: "Restart Claude Code",
          note: "Use 'claude --continue' to resume without losing context",
        },
        {
          step: 3,
          description: "Verify setup",
          note: "Ask Claude: 'List available Canvas App controls' — should invoke list_controls",
        },
      ],
      ifAlreadyRegistered: "Run 'claude mcp remove canvas-authoring' first, then re-add",
    };
  } else if (parsed.toolType === "vscode-copilot") {
    const configPath = ".vscode/mcp.json";
    instructions = {
      tool: "VS Code Copilot",
      prerequisite: ".NET 10 SDK (https://dotnet.microsoft.com/download/dotnet/10.0)",
      configPath,
      steps: [
        {
          step: 1,
          description: `Create/update ${configPath}`,
          config: {
            servers: {
              "canvas-authoring": {
                type: "stdio",
                command: "dnx",
                args: [
                  "Microsoft.PowerApps.CanvasAuthoring.McpServer",
                  "--yes",
                  "--prerelease",
                  "--source",
                  "https://api.nuget.org/v3/index.json",
                ],
                env: {
                  CANVAS_ENVIRONMENT_ID: envId,
                  CANVAS_APP_ID: appId,
                  CANVAS_CLUSTER_CATEGORY: clusterCategory,
                },
              },
            },
          },
        },
        {
          step: 2,
          description: "Save the file and verify canvas-authoring appears in MCP servers list",
        },
      ],
    };
  } else {
    // copilot (GitHub Copilot CLI)
    const configPath =
      scope === "global" ? "~/.copilot/mcp-config.json" : ".mcp.json";
    instructions = {
      tool: "GitHub Copilot CLI",
      prerequisite: ".NET 10 SDK (https://dotnet.microsoft.com/download/dotnet/10.0)",
      configPath,
      steps: [
        {
          step: 1,
          description: `Create/update ${configPath}`,
          config: {
            mcpServers: {
              "canvas-authoring": {
                type: "stdio",
                command: "dnx",
                args: [
                  "Microsoft.PowerApps.CanvasAuthoring.McpServer",
                  "--yes",
                  "--prerelease",
                  "--source",
                  "https://api.nuget.org/v3/index.json",
                ],
                env: {
                  CANVAS_ENVIRONMENT_ID: envId,
                  CANVAS_APP_ID: appId,
                  CANVAS_CLUSTER_CATEGORY: clusterCategory,
                },
              },
            },
          },
        },
        {
          step: 2,
          description: "Restart GitHub Copilot CLI to activate",
        },
        {
          step: 3,
          description: "Verify canvas-authoring appears in MCP servers list",
        },
      ],
    };
  }

  return success({
    message: "Canvas Authoring MCP configuration generated",
    extractedFromUrl: {
      environmentId: envId,
      appId: appId,
      clusterCategory: clusterCategory,
      makerHostname: new URL(parsed.studioUrl).hostname,
    },
    instructions,
    importantNotes: [
      "Keep the Power Apps Studio browser tab OPEN for the entire session",
      "Enable coauthoring in Studio: Settings → Updates → Coauthoring",
      "Closing the Studio tab ends the coauthoring session and breaks canvas_compile/canvas_sync",
    ],
  });
}
