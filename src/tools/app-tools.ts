/**
 * App Tools — list, get, delete, share apps
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as pp from "../api/power-platform.js";
import { getConfig } from "../config.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const ListAppsSchema = z.object({
  environmentId: z.string().optional().describe("Environment ID (uses configured environment if omitted)"),
});

const GetAppSchema = z.object({
  appId: z.string().describe("The app ID (GUID)"),
  environmentId: z.string().optional().describe("Environment ID (uses configured environment if omitted)"),
});

const DeleteAppSchema = z.object({
  appId: z.string().describe("The app ID (GUID) to delete"),
  environmentId: z.string().optional().describe("Environment ID"),
});

const ShareAppSchema = z.object({
  appId: z.string().describe("The app ID (GUID) to share"),
  principalId: z.string().describe("User or Group GUID to share with"),
  roleName: z.enum(["CanView", "CanEdit"]).describe("Permission level: CanView (user) or CanEdit (co-owner)"),
  environmentId: z.string().optional().describe("Environment ID"),
});

function resolveEnvId(explicitId?: string): string {
  const envId = explicitId ?? getConfig().powerPlatformEnvId;
  if (!envId) {
    throw new Error(
      "Environment ID is required. Either pass environmentId or set POWER_PLATFORM_ENV_ID in your configuration."
    );
  }
  return envId;
}

/* ─── Tool Definitions ─────────────────────────────────────── */

export const appToolDefinitions = [
  {
    name: "list_apps",
    description:
      "List all Power Apps (canvas and model-driven) in an environment. " +
      "Returns app names, types, owners, and last modified dates.",
    inputSchema: zodToJsonSchema(ListAppsSchema),
  },
  {
    name: "get_app",
    description: "Get detailed information about a specific Power App including type, status, owner, and settings.",
    inputSchema: zodToJsonSchema(GetAppSchema),
  },
  {
    name: "delete_app",
    description: "Delete a Power App from the environment. This action is irreversible.",
    inputSchema: zodToJsonSchema(DeleteAppSchema),
  },
  {
    name: "share_app",
    description:
      "Share a Power App with a user or security group. " +
      "CanView gives play-only access, CanEdit gives co-owner access.",
    inputSchema: zodToJsonSchema(ShareAppSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleAppTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "list_apps": {
        const { environmentId } = ListAppsSchema.parse(args);
        const envId = resolveEnvId(environmentId);
        const result = await pp.listApps(envId);
        return success(result);
      }
      case "get_app": {
        const { appId, environmentId } = GetAppSchema.parse(args);
        const envId = resolveEnvId(environmentId);
        const result = await pp.getApp(envId, appId);
        return success(result);
      }
      case "delete_app": {
        const { appId, environmentId } = DeleteAppSchema.parse(args);
        const envId = resolveEnvId(environmentId);
        await pp.deleteApp(envId, appId);
        return success({ message: `App ${appId} deleted successfully` });
      }
      case "share_app": {
        const { appId, principalId, roleName, environmentId } = ShareAppSchema.parse(args);
        const envId = resolveEnvId(environmentId);
        const result = await pp.shareApp(envId, appId, principalId, roleName);
        return success({
          message: `App shared with ${principalId} as ${roleName}`,
          result,
        });
      }
      default:
        throw new Error(`Unknown app tool: ${name}`);
    }
  });
}
