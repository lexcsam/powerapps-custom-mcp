/**
 * Token Manager — handles Azure Entra ID authentication.
 * Supports both Client Credentials (headless) and Device Code (interactive) flows.
 */

import {
  ClientSecretCredential,
  DeviceCodeCredential,
  type TokenCredential,
  type AccessToken,
} from "@azure/identity";
import { getConfig, useClientCredentials } from "../config.js";

/** Cached tokens keyed by scope */
const tokenCache = new Map<string, { token: AccessToken; credential: TokenCredential }>();

/** Well-known scopes */
export const SCOPES = {
  dataverse: (url: string) => `${url}/.default`,
  powerPlatform: "https://api.powerplatform.com/.default",
  flow: "https://service.flow.microsoft.com/.default",
} as const;

/**
 * Get or create a credential instance.
 */
function getCredential(): TokenCredential {
  const config = getConfig();

  if (useClientCredentials()) {
    return new ClientSecretCredential(
      config.azureTenantId,
      config.azureClientId,
      config.azureClientSecret!
    );
  }

  // Interactive Device Code flow
  return new DeviceCodeCredential({
    tenantId: config.azureTenantId,
    clientId: config.azureClientId,
    userPromptCallback: (info) => {
      // This message will appear in the MCP server's stderr
      console.error(
        `\n🔐 Authentication required!\n` +
          `   Open: ${info.verificationUri}\n` +
          `   Code: ${info.userCode}\n` +
          `   Message: ${info.message}\n`
      );
    },
  });
}

/**
 * Acquire an access token for the given scope.
 * Uses caching with automatic refresh when token is within 5 minutes of expiry.
 */
export async function getAccessToken(scope: string): Promise<string> {
  const cached = tokenCache.get(scope);

  if (cached) {
    const now = Date.now();
    const expiresAt = cached.token.expiresOnTimestamp;
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt - now > bufferMs) {
      return cached.token.token;
    }
  }

  const credential = cached?.credential ?? getCredential();
  const token = await credential.getToken(scope);

  if (!token) {
    throw new Error(`Failed to acquire token for scope: ${scope}`);
  }

  tokenCache.set(scope, { token, credential });
  return token.token;
}

/**
 * Get a token for Dataverse API calls.
 */
export async function getDataverseToken(): Promise<string> {
  const config = getConfig();
  return getAccessToken(SCOPES.dataverse(config.dataverseUrl));
}

/**
 * Get a token for Power Platform management API calls.
 */
export async function getPowerPlatformToken(): Promise<string> {
  return getAccessToken(SCOPES.powerPlatform);
}

/**
 * Get a token for Power Automate/Flow API calls.
 */
export async function getFlowToken(): Promise<string> {
  return getAccessToken(SCOPES.flow);
}

/**
 * Clear all cached tokens (used when credentials change).
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Test connectivity by fetching a token and returning basic info.
 */
export async function testConnection(): Promise<{
  authenticated: boolean;
  authFlow: string;
  dataverseUrl: string;
  tenantId: string;
}> {
  const config = getConfig();
  await getDataverseToken();

  return {
    authenticated: true,
    authFlow: useClientCredentials() ? "Client Credentials" : "Device Code",
    dataverseUrl: config.dataverseUrl,
    tenantId: config.azureTenantId,
  };
}
