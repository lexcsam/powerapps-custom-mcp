/**
 * Power Platform Management API client.
 * Wraps api.powerplatform.com endpoints for environment and app management.
 */

import { getPowerPlatformToken } from "../auth/token-manager.js";
import { httpRequest } from "./http-client.js";

const BASE_URL = "https://api.powerplatform.com";
const API_VERSION = "2022-03-01-preview";
const ADMIN_API_VERSION = "2020-10-01";

/* ─── Environments ─────────────────────────────────────────── */

export async function listEnvironments(): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments?api-version=${ADMIN_API_VERSION}&$expand=properties.capacity`,
    token
  );
}

export async function getEnvironment(environmentId: string): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/${environmentId}?api-version=${ADMIN_API_VERSION}`,
    token
  );
}

export async function createEnvironment(params: {
  displayName: string;
  location: string;
  environmentSku?: string;
  description?: string;
}): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/providers/Microsoft.BusinessAppPlatform/environments?api-version=${ADMIN_API_VERSION}`,
    token,
    {
      method: "POST",
      body: {
        location: params.location,
        properties: {
          displayName: params.displayName,
          description: params.description ?? "",
          environmentSku: params.environmentSku ?? "Sandbox",
          linkedEnvironmentMetadata: {
            type: "Dynamics365",
            securityGroupId: "",
          },
        },
      },
    }
  );
}

/* ─── Apps ──────────────────────────────────────────────────── */

export async function listApps(environmentId: string): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/powerapps/environments/${environmentId}/apps?api-version=${API_VERSION}`,
    token
  );
}

export async function getApp(
  environmentId: string,
  appId: string
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/powerapps/environments/${environmentId}/apps/${appId}?api-version=${API_VERSION}`,
    token
  );
}

export async function deleteApp(
  environmentId: string,
  appId: string
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/powerapps/environments/${environmentId}/apps/${appId}?api-version=${API_VERSION}`,
    token,
    { method: "DELETE" }
  );
}

export async function shareApp(
  environmentId: string,
  appId: string,
  principalId: string,
  roleName: string
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/powerapps/environments/${environmentId}/apps/${appId}/modifyPermissions?api-version=${API_VERSION}`,
    token,
    {
      method: "POST",
      body: {
        put: [
          {
            properties: {
              roleName: roleName,
              principal: {
                id: principalId,
                type: "User",
              },
              NotifyShareTargetOption: "Notify",
            },
          },
        ],
      },
    }
  );
}

/* ─── Connectors ───────────────────────────────────────────── */

export async function listConnectors(
  environmentId: string
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/providers/Microsoft.PowerApps/environments/${environmentId}/apis?api-version=${API_VERSION}&$filter=environment eq '${environmentId}'`,
    token
  );
}

export async function getConnector(
  environmentId: string,
  connectorName: string
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/providers/Microsoft.PowerApps/environments/${environmentId}/apis/${connectorName}?api-version=${API_VERSION}`,
    token
  );
}

export async function createCustomConnector(
  environmentId: string,
  params: {
    displayName: string;
    openApiDefinition: unknown;
    description?: string;
    iconUrl?: string;
  }
): Promise<unknown> {
  const token = await getPowerPlatformToken();
  return httpRequest(
    `${BASE_URL}/providers/Microsoft.PowerApps/environments/${environmentId}/apis?api-version=${API_VERSION}`,
    token,
    {
      method: "POST",
      body: {
        properties: {
          displayName: params.displayName,
          description: params.description ?? "",
          iconUri: params.iconUrl,
          apiDefinitions: {
            originalSwaggerUrl: "",
            modifiedSwaggerUrl: "",
          },
          openApiDefinition: params.openApiDefinition,
          environment: {
            id: `/providers/Microsoft.PowerApps/environments/${environmentId}`,
            name: environmentId,
          },
        },
      },
    }
  );
}
