/**
 * Canvas Authoring MCP Proxy
 *
 * Spawns the .NET CanvasAuthoringMcpServer as a child process and forwards
 * MCP tool calls to it via JSON-RPC over stdio. This allows our Node.js MCP
 * server to expose the 8 canvas-authoring tools as if they were native.
 *
 * Requirements:
 * - .NET 10 SDK installed
 * - CANVAS_ENVIRONMENT_ID, CANVAS_APP_ID env vars set
 * - A live Power Apps Studio coauthoring session open in the browser
 */

import { spawn, type ChildProcess } from "child_process";

/* ─── Types ────────────────────────────────────────────────── */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface CanvasProxyConfig {
  environmentId: string;
  appId: string;
  clusterCategory: string;
}

/* ─── State ────────────────────────────────────────────────── */

let childProcess: ChildProcess | null = null;
let requestId = 0;
let initialized = false;
const pendingRequests = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>();
let responseBuffer = "";

/* ─── Configuration ────────────────────────────────────────── */

function getCanvasConfig(): CanvasProxyConfig | null {
  const environmentId = process.env.CANVAS_ENVIRONMENT_ID;
  const appId = process.env.CANVAS_APP_ID;
  const clusterCategory = process.env.CANVAS_CLUSTER_CATEGORY ?? "prod";

  if (!environmentId || !appId) {
    return null;
  }

  return { environmentId, appId, clusterCategory };
}

/* ─── Process Management ───────────────────────────────────── */

function parseResponses(data: string): void {
  responseBuffer += data;

  // JSON-RPC messages are separated by newlines
  const lines = responseBuffer.split("\n");
  responseBuffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const response = JSON.parse(trimmed) as JsonRpcResponse;
      if (response.id !== undefined) {
        const pending = pendingRequests.get(response.id);
        if (pending) {
          pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(
              new Error(
                `Canvas MCP error: ${response.error.message} (code: ${response.error.code})`
              )
            );
          } else {
            pending.resolve(response.result);
          }
        }
      }
    } catch {
      // Not valid JSON — may be a partial message or log line, skip
    }
  }
}

async function ensureStarted(): Promise<void> {
  const config = getCanvasConfig();
  if (!config) {
    throw new Error(
      "Canvas authoring not configured. Set CANVAS_ENVIRONMENT_ID and CANVAS_APP_ID " +
        "environment variables. Use the configure_canvas_mcp tool for setup instructions."
    );
  }

  if (childProcess && !childProcess.killed) {
    return;
  }

  // Spawn the .NET MCP server via dnx (dotnet tool runner)
  childProcess = spawn(
    "dnx",
    [
      "Microsoft.PowerApps.CanvasAuthoring.McpServer",
      "--yes",
      "--prerelease",
      "--source",
      "https://api.nuget.org/v3/index.json",
    ],
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        CANVAS_ENVIRONMENT_ID: config.environmentId,
        CANVAS_APP_ID: config.appId,
        CANVAS_CLUSTER_CATEGORY: config.clusterCategory,
      },
    }
  );

  childProcess.stdout?.on("data", (data: Buffer) => {
    parseResponses(data.toString());
  });

  childProcess.stderr?.on("data", (data: Buffer) => {
    // Log .NET server stderr to our stderr for diagnostics
    console.error(`[canvas-authoring] ${data.toString().trim()}`);
  });

  childProcess.on("exit", (code) => {
    console.error(
      `[canvas-authoring] Process exited with code ${code}`
    );
    childProcess = null;
    initialized = false;

    // Reject any pending requests
    for (const [id, pending] of pendingRequests) {
      pending.reject(
        new Error("Canvas authoring process exited unexpectedly")
      );
      pendingRequests.delete(id);
    }
  });

  childProcess.on("error", (err) => {
    console.error(`[canvas-authoring] Failed to start: ${err.message}`);
    childProcess = null;
    initialized = false;
  });

  // Send MCP initialize request
  if (!initialized) {
    await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "powerapps-custom-mcp", version: "1.0.0" },
    });
    // Send initialized notification (no response expected)
    sendNotification("notifications/initialized", {});
    initialized = true;
  }
}

function sendNotification(method: string, params: unknown): void {
  if (!childProcess?.stdin?.writable) return;

  const notification = {
    jsonrpc: "2.0",
    method,
    params,
  };

  childProcess.stdin.write(JSON.stringify(notification) + "\n");
}

function sendRequest(method: string, params?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!childProcess?.stdin?.writable) {
      reject(new Error("Canvas authoring process is not running"));
      return;
    }

    const id = ++requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    pendingRequests.set(id, { resolve, reject });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("Canvas authoring request timed out after 60s"));
      }
    }, 60_000);

    childProcess!.stdin!.write(JSON.stringify(request) + "\n");
  });
}

/* ─── Public API ───────────────────────────────────────────── */

/**
 * Call a tool on the Canvas Authoring MCP server.
 * Starts the child process if not already running.
 */
export async function callCanvasTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  await ensureStarted();

  const result = await sendRequest("tools/call", {
    name: toolName,
    arguments: args,
  });

  return result;
}

/**
 * Check if canvas authoring is configured (env vars present).
 */
export function isCanvasConfigured(): boolean {
  return getCanvasConfig() !== null;
}

/**
 * Check if the canvas authoring child process is running.
 */
export function isCanvasRunning(): boolean {
  return childProcess !== null && !childProcess.killed;
}

/**
 * Stop the canvas authoring child process.
 */
export function stopCanvasProxy(): void {
  if (childProcess && !childProcess.killed) {
    childProcess.kill("SIGTERM");
    childProcess = null;
    initialized = false;
    pendingRequests.clear();
  }
}
