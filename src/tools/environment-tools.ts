/**
 * Environment Tools — list, get, create, switch environments
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as pp from "../api/power-platform.js";
import { updateConfig } from "../config.js";
import { clearTokenCache } from "../auth/token-manager.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const GetEnvSchema = z.object({
  environmentId: z.string().describe("The environment ID to retrieve details for"),
});

const CreateEnvSchema = z.object({
  displayName: z.string().describe("Display name for the new environment"),
  location: z.string().describe("Azure region, e.g. 'unitedstates', 'europe', 'asia'"),
  environmentSku: z.enum(["Sandbox", "Production", "Trial"]).optional().describe("Environment type (default: Sandbox)"),
  description: z.string().optional().describe("Optional description"),
});

const SwitchEnvSchema = z.object({
  dataverseUrl: z.string().url().describe("New Dataverse URL to switch to, e.g. https://neworg.crm.dynamics.com"),
  environmentId: z.string().optional().describe("Optional environment ID for management API calls"),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const environmentToolDefinitions = [
  {
    name: "list_environments",
    description:
      "List all Power Platform environments accessible to the authenticated user/service principal. " +
      "Returns environment names, IDs, URLs, types, and states.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_environment",
    description: "Get detailed information about a specific Power Platform environment including capacity and settings.",
    inputSchema: zodToJsonSchema(GetEnvSchema),
  },
  {
    name: "create_environment",
    description:
      "Create a new Power Platform environment. Requires tenant admin permissions. " +
      "Creates a Sandbox environment by default.",
    inputSchema: zodToJsonSchema(CreateEnvSchema),
  },
  {
    name: "switch_environment",
    description:
      "Switch the active Dataverse environment URL. All subsequent Dataverse and solution operations " +
      "will target the new environment. Use list_environments to find available URLs.",
    inputSchema: zodToJsonSchema(SwitchEnvSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleEnvironmentTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "list_environments": {
        const result = await pp.listEnvironments();
        return success(result);
      }
      case "get_environment": {
        const { environmentId } = GetEnvSchema.parse(args);
        const result = await pp.getEnvironment(environmentId);
        return success(result);
      }
      case "create_environment": {
        const params = CreateEnvSchema.parse(args);
        const result = await pp.createEnvironment(params);
        return success(result);
      }
      case "switch_environment": {
        const { dataverseUrl, environmentId } = SwitchEnvSchema.parse(args);
        clearTokenCache();
        const cfg = updateConfig({
          dataverseUrl,
          ...(environmentId ? { powerPlatformEnvId: environmentId } : {}),
        });
        return success({
          message: "Environment switched successfully",
          dataverseUrl: cfg.dataverseUrl,
          environmentId: cfg.powerPlatformEnvId ?? "(not set)",
        });
      }
      default:
        throw new Error(`Unknown environment tool: ${name}`);
    }
  });
}
