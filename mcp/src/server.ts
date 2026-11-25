import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { geometryInputShape, resolveGeometry } from "./schema";
import { analyse, describe } from "./summary";

export const VIEWER_URI = "ui://mtb-suspension/viewer.html";

/** Claude's per-server sandbox origin: first 32 hex of SHA-256(server URL). */
export async function claudeUiDomain(serverUrl: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serverUrl),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 32)}.claudemcpcontent.com`;
}

export function buildServer(opts: { viewerHtml: string; uiDomain?: string }) {
  const server = new McpServer({ name: "mtb-suspension", version: "0.1.0" });

  registerAppTool(
    server,
    "analyze_bike",
    {
      title: "Analyze MTB suspension kinematics",
      description:
        "Compute mountain bike suspension kinematics (leverage ratio, anti-squat, anti-rise, pedal kickback, chain growth, wheel rate, trail, pitch) across the full shock stroke for a frame geometry, and show an interactive animated side view. All inputs are optional; omitted fields use a sensible 150 mm trail-bike default. Lengths are mm, angles degrees, coordinates are relative to the bottom bracket (x forward, y up).",
      inputSchema: geometryInputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: VIEWER_URI } },
    },
    async (input) => {
      const geometry = resolveGeometry(input);
      const outcome = analyse(geometry);
      if (!outcome.ok) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: outcome.error }],
        };
      }
      return {
        content: [
          { type: "text" as const, text: describe(outcome.summary, geometry) },
        ],
        // The viewer re-runs the (≈1 ms) analysis locally from `geometry`,
        // so the full per-step state never crosses the wire.
        structuredContent: { geometry, ...outcome.summary },
      };
    },
  );

  registerAppResource(
    server,
    "MTB suspension viewer",
    VIEWER_URI,
    { description: "Interactive suspension kinematics viewer" },
    async () => ({
      contents: [
        {
          uri: VIEWER_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: opts.viewerHtml,
          _meta: {
            ui: { ...(opts.uiDomain ? { domain: opts.uiDomain } : {}) },
          },
        },
      ],
    }),
  );

  return server;
}
