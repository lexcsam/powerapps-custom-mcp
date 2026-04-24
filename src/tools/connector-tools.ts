/**
 * Connector Tools — list, get, create custom connectors
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as pp from "../api/power-platform.js";
import { getConfig } from "../config.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const GetConnectorSchema = z.object({
  connectorName: z.string().describe("Connector API name / identifier"),
  environmentId: z.string().optional().describe("Environment ID (uses configured environment if omitted)"),
});

const CreateConnectorSchema = z.object({
  displayName: z.string().describe("Display name for the custom connector"),
  openApiDefinition: z.unknown().describe("OpenAPI/Swagger definition (JSON object) describing the API endpoints"),
  description: z.string().optional().describe("Connector description"),
  iconUrl: z.string().optional().describe("URL to an icon image for the connector"),
  environmentId: z.string().optional().describe("Environment ID"),
});

function resolveEnvId(explicitId?: string): string {
  const envId = explicitId ?? getConfig().powerPlatformEnvId;
  if (!envId) {
    throw new Error(
      "Environment ID is required for connector operations. Set POWER_PLATFORM_ENV_ID in your configuration."
    );
  }
  return envId;
}

/* ─── Tool Definitions ─────────────────────────────────────── */

export const connectorToolDefinitions = [
  {
    name: "list_connectors",
    description:
      "List all available connectors (standard and custom) in the environment. " +
      "Returns connector names, types, and statuses.",
    inputSchema: {
      type: "object" as const,
      properties: {
        environmentId: {
          type: "string",
          description: "Environment ID (uses configured environment if omitted)",
        },
      },
    },
  },
  {
    name: "get_connector",
    description: "Get detailed information about a specific connector including its operations and supported authentication.",
    inputSchema: zodToJsonSchema(GetConnectorSchema),
  },
  {
    name: "create_custom_connector",
    description:
      "Create a custom connector from an OpenAPI/Swagger definition. " +
      "Provide the full OpenAPI spec as a JSON object. The connector will be available for use in Power Apps and Power Automate.",
    inputSchema: zodToJsonSchema(CreateConnectorSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleConnectorTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "list_connectors": {
        const environmentId = (args as { environmentId?: string }).environmentId;
        const envId = resolveEnvId(environmentId);
        const result = await pp.listConnectors(envId);
        return success(result);
      }
      case "get_connector": {
        const { connectorName, environmentId } = GetConnectorSchema.parse(args);
        const envId = resolveEnvId(environmentId);
        const result = await pp.getConnector(envId, connectorName);
        return success(result);
      }
      case "create_custom_connector": {
        const { displayName, openApiDefinition, description, iconUrl, environmentId } =
          CreateConnectorSchema.parse(args);
        const envId = resolveEnvId(environmentId);
        const result = await pp.createCustomConnector(envId, {
          displayName,
          openApiDefinition,
          description,
          iconUrl,
        });
        return success({
          message: `Custom connector '${displayName}' created successfully`,
          connector: result,
        });
      }
      default:
        throw new Error(`Unknown connector tool: ${name}`);
    }
  });
}
