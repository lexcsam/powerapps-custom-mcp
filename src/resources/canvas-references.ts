/**
 * Canvas Reference Resources — MCP Resource handlers
 *
 * Exposes the TechnicalGuide and DesignGuide as MCP resources
 * that AI clients can read for canvas app development guidance.
 *
 * Resources:
 *   canvas://references/technical-guide — YAML syntax, controls, layout, Power Fx
 *   canvas://references/design-guide    — Aesthetic guidelines, anti-patterns
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/* ─── Path Resolution ──────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REFERENCES_DIR = resolve(__dirname, "../../references");

/* ─── Resource Definitions ─────────────────────────────────── */

export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const canvasResourceDefinitions: McpResource[] = [
  {
    uri: "canvas://references/technical-guide",
    name: "Canvas App Technical Guide",
    description:
      "Comprehensive guide for generating Canvas App YAML screens: " +
      "file structure, Power Fx syntax, layout strategies (ManualLayout vs AutoLayout), " +
      "control selection, state management, and validation workflow.",
    mimeType: "text/markdown",
  },
  {
    uri: "canvas://references/design-guide",
    name: "Canvas App Design Guide",
    description:
      "Aesthetic guidelines for creating distinctive Canvas App screens: " +
      "design thinking process, typography, color, spatial composition, " +
      "interactive states, anti-patterns to avoid, and creative interpretation.",
    mimeType: "text/markdown",
  },
];

/* ─── Resource Handlers ────────────────────────────────────── */

const RESOURCE_FILE_MAP: Record<string, string> = {
  "canvas://references/technical-guide": "TechnicalGuide.md",
  "canvas://references/design-guide": "DesignGuide.md",
};

/**
 * Read the contents of a canvas reference resource.
 */
export function readCanvasResource(uri: string): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} {
  const fileName = RESOURCE_FILE_MAP[uri];
  if (!fileName) {
    throw new Error(
      `Unknown resource URI: ${uri}. ` +
        `Available resources: ${Object.keys(RESOURCE_FILE_MAP).join(", ")}`
    );
  }

  const filePath = resolve(REFERENCES_DIR, fileName);
  const content = readFileSync(filePath, "utf-8");

  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: content,
      },
    ],
  };
}
