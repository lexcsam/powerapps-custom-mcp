/**
 * Security Tools — list security roles, assign roles to users
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as dv from "../api/dataverse.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const AssignRoleSchema = z.object({
  userId: z.string().describe("System user GUID to assign the role to"),
  roleId: z.string().describe("Security role GUID to assign"),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const securityToolDefinitions = [
  {
    name: "list_security_roles",
    description:
      "List all security roles in the Dataverse environment. " +
      "Returns role names, IDs, and whether they are managed.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "assign_security_role",
    description:
      "Assign a security role to a user. Provide the user's system user GUID and the role GUID. " +
      "Use list_security_roles to find role IDs.",
    inputSchema: zodToJsonSchema(AssignRoleSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleSecurityTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "list_security_roles": {
        const result = await dv.listSecurityRoles();
        return success(result);
      }
      case "assign_security_role": {
        const { userId, roleId } = AssignRoleSchema.parse(args);
        await dv.assignSecurityRole(userId, roleId);
        return success({
          message: `Security role ${roleId} assigned to user ${userId} successfully`,
        });
      }
      default:
        throw new Error(`Unknown security tool: ${name}`);
    }
  });
}
