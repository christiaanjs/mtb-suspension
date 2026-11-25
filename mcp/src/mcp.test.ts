import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SuspensionType } from "@/lib/types";
import { geometryInputSchema, resolveGeometry } from "./schema";
import { analyse } from "./summary";
import { buildServer, claudeUiDomain, VIEWER_URI } from "./server";

async function connect() {
  const server = buildServer({ viewerHtml: "<html>stub</html>" });
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe("schema", () => {
  it("accepts an empty object and fills defaults", () => {
    const g = resolveGeometry(geometryInputSchema.parse({}));
    expect(g.suspensionType).toBe(SuspensionType.SinglePivot);
    expect(g.shockStroke).toBe(65);
  });
  it("applies overrides", () => {
    expect(resolveGeometry({ headAngle: 63 }).headAngle).toBe(63);
  });
  it("rejects out-of-range values", () => {
    expect(geometryInputSchema.safeParse({ headAngle: 10 }).success).toBe(false);
    expect(geometryInputSchema.safeParse({ shockStroke: 1e9 }).success).toBe(false);
    expect(geometryInputSchema.safeParse({ reach: NaN }).success).toBe(false);
  });
  it("does not expose unused totalTravel", () => {
    expect("totalTravel" in geometryInputSchema.shape).toBe(false);
  });
});

describe("analyse", () => {
  it.each([SuspensionType.SinglePivot, SuspensionType.FourBar])(
    "summarises %s defaults with finite numbers",
    (suspensionType) => {
      const out = analyse(resolveGeometry({ suspensionType }));
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.summary.curves.leverageRatio).toHaveLength(21);
      // Must fit comfortably under Claude's ~150k char tool-result cap.
      expect(JSON.stringify(out.summary).length).toBeLessThan(10_000);
    },
  );
  it("reports unsolvable geometry as an error, not NaN", () => {
    const out = analyse(resolveGeometry({ shockETE: 100, shockStroke: 100 }));
    if (out.ok) {
      expect(JSON.stringify(out.summary)).not.toContain("null");
    } else {
      expect(out.error.length).toBeGreaterThan(0);
    }
  });
});

describe("MCP server", () => {
  it("lists analyze_bike linked to the UI resource", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["analyze_bike"]);
    expect((tools[0]._meta as { ui: { resourceUri: string } }).ui.resourceUri).toBe(VIEWER_URI);
  });
  it("returns text + structuredContent with geometry", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "analyze_bike", arguments: { headAngle: 63.5 } });
    expect(res.isError).toBeFalsy();
    const sc = res.structuredContent as { geometry: { headAngle: number } };
    expect(sc.geometry.headAngle).toBe(63.5);
    expect((res.content as { text: string }[])[0].text).toContain("leverage ratio");
  });
  it("serves the viewer as an MCP app resource", async () => {
    const client = await connect();
    const res = await client.readResource({ uri: VIEWER_URI });
    expect(res.contents[0].mimeType).toBe("text/html;profile=mcp-app");
  });
});

describe("claudeUiDomain", () => {
  it("matches the example in Claude's docs", async () => {
    expect(await claudeUiDomain("https://example.com/mcp")).toBe(
      "c3d80a4ed901ee05b21755a88273b4a4.claudemcpcontent.com",
    );
  });
});
