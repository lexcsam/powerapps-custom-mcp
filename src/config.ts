import { z } from "zod";

/**
 * Configuration schema validated with Zod.
 * Supports both Client Credentials (headless) and Device Code (interactive) flows.
 */
const ConfigSchema = z.object({
  azureTenantId: z.string().min(1, "AZURE_TENANT_ID is required"),
  azureClientId: z.string().min(1, "AZURE_CLIENT_ID is required"),
  azureClientSecret: z.string().optional(),
  dataverseUrl: z
    .string()
    .url("DATAVERSE_URL must be a valid URL")
    .transform((url) => url.replace(/\/$/, "")), // strip trailing slash
  powerPlatformEnvId: z.string().optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let currentConfig: AppConfig | null = null;

/**
 * Load configuration from environment variables.
 */
export function loadConfig(): AppConfig {
  const raw = {
    azureTenantId: process.env.AZURE_TENANT_ID ?? "",
    azureClientId: process.env.AZURE_CLIENT_ID ?? "",
    azureClientSecret: process.env.AZURE_CLIENT_SECRET || undefined,
    dataverseUrl: process.env.DATAVERSE_URL ?? "",
    powerPlatformEnvId: process.env.POWER_PLATFORM_ENV_ID || undefined,
  };

  const parsed = ConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuration validation failed:\n${issues}\n\nSee .env.example for required variables.`
    );
  }

  currentConfig = parsed.data;
  return currentConfig;
}

/**
 * Get the current configuration (throws if not loaded).
 */
export function getConfig(): AppConfig {
  if (!currentConfig) {
    return loadConfig();
  }
  return currentConfig;
}

/**
 * Update configuration at runtime (used by configure_auth tool).
 */
export function updateConfig(partial: Partial<AppConfig>): AppConfig {
  const merged = { ...getConfig(), ...partial };
  const parsed = ConfigSchema.parse(merged);
  currentConfig = parsed;
  return currentConfig;
}

/**
 * Check if configuration has been loaded.
 */
export function isConfigured(): boolean {
  return currentConfig !== null;
}

/**
 * Determine if we should use client credentials flow (headless) or device code flow (interactive).
 */
export function useClientCredentials(): boolean {
  const cfg = getConfig();
  return !!cfg.azureClientSecret && cfg.azureClientSecret.length > 0;
}
