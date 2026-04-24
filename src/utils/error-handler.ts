/**
 * Standardized error handling for MCP tool responses.
 * Maps HTTP errors and API errors to user-friendly MCP content blocks.
 */

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/**
 * Create a successful MCP tool response.
 */
export function success(data: unknown): McpToolResult {
  const text =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Create an error MCP tool response.
 */
export function error(message: string, details?: unknown): McpToolResult {
  let text = `Error: ${message}`;
  if (details) {
    text += `\n\nDetails:\n${typeof details === "string" ? details : JSON.stringify(details, null, 2)}`;
  }
  return {
    content: [{ type: "text", text }],
    isError: true,
  };
}

/**
 * Map HTTP status codes to user-friendly error messages.
 */
export function httpError(
  status: number,
  statusText: string,
  body?: string
): McpToolResult {
  const messages: Record<number, string> = {
    400: "Bad Request — check your input parameters",
    401: "Unauthorized — your credentials may be expired. Run configure_auth or test_connection to re-authenticate",
    403: "Forbidden — you don't have permission for this operation. Check your security roles in the Power Platform Admin Center",
    404: "Not Found — the resource doesn't exist or you don't have access",
    409: "Conflict — the resource already exists or there's a version conflict",
    412: "Precondition Failed — the resource was modified since your last read",
    429: "Rate Limited — too many requests. Wait a moment and try again",
    500: "Internal Server Error — the Power Platform service encountered an error",
    503: "Service Unavailable — the Power Platform service is temporarily unavailable",
  };

  const friendlyMessage =
    messages[status] ?? `HTTP ${status} ${statusText}`;

  let details: string | undefined;
  if (body) {
    try {
      const parsed = JSON.parse(body);
      // Dataverse errors have a specific format
      if (parsed.error?.message) {
        details = parsed.error.message;
      } else if (parsed.message) {
        details = parsed.message;
      } else {
        details = body;
      }
    } catch {
      details = body;
    }
  }

  return error(friendlyMessage, details);
}

/**
 * Wrap an async tool handler with error catching.
 */
export async function withErrorHandling(
  fn: () => Promise<McpToolResult>
): Promise<McpToolResult> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof Error) {
      return error(err.message);
    }
    return error("An unexpected error occurred", String(err));
  }
}
