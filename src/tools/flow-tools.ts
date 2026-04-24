/**
 * Flow Tools — list, trigger, get run history, toggle flows
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as flowApi from "../api/flow.js";
import { success, withErrorHandling, type McpToolResult } from "../utils/error-handler.js";

/* ─── Schemas ──────────────────────────────────────────────── */

const TriggerFlowSchema = z.object({
  flowId: z.string().describe("The flow ID (GUID)"),
  triggerName: z.string().optional().describe("Name of the trigger (default: 'manual')"),
  inputs: z.record(z.unknown()).optional().describe("Input parameters for the flow trigger"),
});

const FlowIdSchema = z.object({
  flowId: z.string().describe("The flow ID (GUID)"),
});

const FlowRunsSchema = z.object({
  flowId: z.string().describe("The flow ID (GUID)"),
  top: z.number().optional().describe("Number of runs to return (default: 10)"),
});

const ToggleFlowSchema = z.object({
  flowId: z.string().describe("The flow ID (GUID)"),
  enabled: z.boolean().describe("true to enable, false to disable"),
});

/* ─── Tool Definitions ─────────────────────────────────────── */

export const flowToolDefinitions = [
  {
    name: "list_flows",
    description:
      "List all cloud flows (Power Automate) in the current environment. " +
      "Returns flow names, statuses, trigger types, and last run times. Requires POWER_PLATFORM_ENV_ID.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "trigger_flow",
    description:
      "Trigger an instant (manual) cloud flow with optional input parameters. " +
      "Only works with flows that have a manual trigger.",
    inputSchema: zodToJsonSchema(TriggerFlowSchema),
  },
  {
    name: "get_flow_runs",
    description: "Get recent run history for a specific flow including statuses, timestamps, and durations.",
    inputSchema: zodToJsonSchema(FlowRunsSchema),
  },
  {
    name: "toggle_flow",
    description: "Enable or disable a cloud flow. Set enabled=true to turn on, enabled=false to turn off.",
    inputSchema: zodToJsonSchema(ToggleFlowSchema),
  },
];

/* ─── Handlers ─────────────────────────────────────────────── */

export async function handleFlowTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  return withErrorHandling(async () => {
    switch (name) {
      case "list_flows": {
        const result = await flowApi.listFlows();
        return success(result);
      }
      case "trigger_flow": {
        const { flowId, triggerName, inputs } = TriggerFlowSchema.parse(args);
        const result = await flowApi.triggerFlow(
          flowId,
          triggerName ?? "manual",
          inputs
        );
        return success({
          message: `Flow ${flowId} triggered successfully`,
          result,
        });
      }
      case "get_flow_runs": {
        const { flowId, top } = FlowRunsSchema.parse(args);
        const result = await flowApi.getFlowRuns(flowId, top);
        return success(result);
      }
      case "toggle_flow": {
        const { flowId, enabled } = ToggleFlowSchema.parse(args);
        if (enabled) {
          await flowApi.enableFlow(flowId);
        } else {
          await flowApi.disableFlow(flowId);
        }
        return success({
          message: `Flow ${flowId} ${enabled ? "enabled" : "disabled"} successfully`,
        });
      }
      default:
        throw new Error(`Unknown flow tool: ${name}`);
    }
  });
}
