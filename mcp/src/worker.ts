import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
// Built by `vite build` (see vite.config.ts); loaded as text via wrangler `rules`.
import viewerHtml from "../dist/viewer.html";
import { buildServer, claudeUiDomain } from "./server";

interface RateLimit {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Public URL of the /mcp endpoint, used to derive Claude's ui.domain. */
  PUBLIC_MCP_URL?: string;
  RATE_LIMITER?: RateLimit;
}

const MAX_BODY_BYTES = 32 * 1024;

const json = (status: number, body: unknown, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const rpcError = (status: number, message: string, headers?: HeadersInit) =>
  json(status, { jsonrpc: "2.0", error: { code: -32000, message }, id: null }, headers);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        "MTB suspension kinematics MCP server. Connect a client to /mcp.\n",
        { headers: { "content-type": "text/plain" } },
      );
    }
    if (url.pathname !== "/mcp") return new Response("Not found", { status: 404 });

    // Stateless server: no sessions, so no SSE stream (GET) or teardown (DELETE).
    if (request.method !== "POST") {
      return rpcError(405, "Method not allowed.", { allow: "POST" });
    }

    // Rate limit per client IP. Binding is optional so local dev works without it.
    if (env.RATE_LIMITER) {
      const key = request.headers.get("cf-connecting-ip") ?? "anonymous";
      const { success } = await env.RATE_LIMITER.limit({ key });
      if (!success) return rpcError(429, "Rate limit exceeded.", { "retry-after": "60" });
    }

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return rpcError(413, "Request too large.");

    const server = buildServer({
      viewerHtml,
      uiDomain: env.PUBLIC_MCP_URL
        ? await claudeUiDomain(env.PUBLIC_MCP_URL)
        : undefined,
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
