/**
 * Power Automate / Flow Management API client.
 * Uses the Flow management endpoints for listing, triggering, and managing flows.
 */

import { getConfig } from "../config.js";
import { getFlowToken, getPowerPlatformToken } from "../auth/token-manager.js";
import { httpRequest } from "./http-client.js";

const FLOW_BASE = "https://management.azure.com";
const FLOW_API_BASE = "https://api.flow.microsoft.com";

function envId(): string {
  const config = getConfig();
  if (!config.powerPlatformEnvId) {
    throw new Error(
      "POWER_PLATFORM_ENV_ID is required for flow operations. Set it in your .env file or use configure_auth to set it."
    );
  }
  return config.powerPlatformEnvId;
}

/* ─── List Flows ───────────────────────────────────────────── */

export async function listFlows(): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `https://api.powerplatform.com/providers/Microsoft.ProcessSimple/environments/${envId()}/flows?api-version=2016-11-01`,
    token
  );
}

/* ─── Get Flow Details ─────────────────────────────────────── */

export async function getFlow(flowId: string): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `https://api.powerplatform.com/providers/Microsoft.ProcessSimple/environments/${envId()}/flows/${flowId}?api-version=2016-11-01`,
    token
  );
}

/* ─── Trigger Flow ─────────────────────────────────────────── */

export async function triggerFlow(
  flowId: string,
  triggerName: string,
  inputs?: Record<string, unknown>
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `https://api.powerplatform.com/providers/Microsoft.ProcessSimple/environments/${envId()}/flows/${flowId}/triggers/${triggerName}/run?api-version=2016-11-01`,
    token,
    {
      method: "POST",
      body: inputs ?? {},
    }
  );
}

/* ─── Get Flow Run History ─────────────────────────────────── */

export async function getFlowRuns(
  flowId: string,
  top: number = 10
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `https://api.powerplatform.com/providers/Microsoft.ProcessSimple/environments/${envId()}/flows/${flowId}/runs?api-version=2016-11-01&$top=${top}`,
    token
  );
}

/* ─── Enable / Disable Flow ────────────────────────────────── */

export async function enableFlow(flowId: string): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `https://api.powerplatform.com/providers/Microsoft.ProcessSimple/environments/${envId()}/flows/${flowId}/start?api-version=2016-11-01`,
    token,
    { method: "POST" }
  );
}

export async function disableFlow(flowId: string): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `https://api.powerplatform.com/providers/Microsoft.ProcessSimple/environments/${envId()}/flows/${flowId}/stop?api-version=2016-11-01`,
    token,
    { method: "POST" }
  );
}
