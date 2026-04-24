/**
 * Auth Tools — configure_auth, test_connection
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { updateConfig } from "../config.js";
import { testConnection, clearTokenCache } from "../auth/token-manager.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const ConfigureAuthSchema = z.object({
  tenantId: z.string().optional().describe("Azure Tenant ID"),
  clientId: z.string().optional().describe("Azure AD App Client ID"),
  clientSecret: z.string().optional().describe("Client Secret (omit for interactive Device Code flow)"),
  dataverseUrl: z.string().optional().describe("Dataverse environment URL, e.g. https://orgname.crm.dynamics.com"),
  environmentId: z.string().optional().describe("Power Platform Environment ID"),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const authToolDefinitions = [
  {
    name: "configure_auth",
    description:
      "Configure or update Azure credentials and Dataverse URL at runtime. " +
      "Pass only the fields you want to change. If clientSecret is omitted, the server will use interactive Device Code flow for authentication.",
    inputSchema: zodToJsonSchema(ConfigureAuthSchema),
  },
  {
    name: "test_connection",
    description:
      "Test connectivity to the Power Platform by acquiring a token and verifying the Dataverse endpoint. " +
      "Returns authentication method, tenant ID, and environment URL. Use this to verify your credentials are working.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleAuthTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "configure_auth": {
        const parsed = ConfigureAuthSchema.parse(args);
        const partial: Record<string, unknown> = {};
        if (parsed.tenantId) partial.azureTenantId = parsed.tenantId;
        if (parsed.clientId) partial.azureClientId = parsed.clientId;
        if (parsed.clientSecret !== undefined)
          partial.azureClientSecret = parsed.clientSecret;
        if (parsed.dataverseUrl) partial.dataverseUrl = parsed.dataverseUrl;
        if (parsed.environmentId)
          partial.powerPlatformEnvId = parsed.environmentId;

        clearTokenCache();
        const cfg = updateConfig(partial);
        return success({
          message: "Configuration updated successfully",
          dataverseUrl: cfg.dataverseUrl,
          tenantId: cfg.azureTenantId,
          authFlow: cfg.azureClientSecret
            ? "Client Credentials"
            : "Device Code (interactive)",
        });
      }
      case "test_connection": {
        const result = await testConnection();
        return success({
          status: "Connected",
          ...result,
        });
      }
      default:
        throw new Error(`Unknown auth tool: ${name}`);
    }
  });
}
