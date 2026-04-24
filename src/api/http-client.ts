/**
 * Shared HTTP client with Bearer token injection, retry logic, and error handling.
 */

import { httpError, type McpToolResult } from "../utils/error-handler.js";

interface HttpOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  maxRetries?: number;
}

/**
 * Make an authenticated HTTP request with automatic retry on 429/503.
 */
export async function httpRequest<T = unknown>(
  url: string,
  token: string,
  options: HttpOptions = {}
): Promise<T> {
  const { method = "GET", headers = {}, body, maxRetries = 2 } = options;

  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    ...headers,
  };

  if (body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 429 || response.status === 503) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.min(1000 * Math.pow(2, attempt), 10000);

        if (attempt < maxRetries) {
          await sleep(waitMs);
          continue;
        }
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const responseText = await response.text();

      if (!response.ok) {
        const errResult = httpError(
          response.status,
          response.statusText,
          responseText
        );
        throw new HttpApiError(
          response.status,
          errResult.content[0].text,
          errResult
        );
      }

      if (responseText) {
        return JSON.parse(responseText) as T;
      }
      return undefined as T;
    } catch (err) {
      if (err instanceof HttpApiError) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

export class HttpApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly mcpResult: McpToolResult
  ) {
    super(message);
    this.name = "HttpApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
