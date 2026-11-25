# MTB Suspension MCP App: plan

A remote MCP server, deployed as a Cloudflare Worker, that lets an MCP client
(Claude, etc.) compute suspension kinematics from frame geometry and renders
the existing bike visualisation inline as an **MCP App**.

Status legend: ✅ done in the spike · 🔲 not started · ❓ needs verification

---

## 1. Goals and non-goals

**Goals**

1. A tool that takes frame/suspension geometry and returns kinematic results.
2. An interactive animated side view rendered inside the client (MCP App).
3. Reuse `lib/*` and `components/visualization/*` unchanged. No fork of the maths.
4. Near-zero cost that does not scale with request count (hard cap, not overage).
5. No user accounts. Abuse protection via rate limiting and bounded inputs.

**Non-goals (for now)**

- Per-user auth, saved bikes, or any persisted state.
- Changing the web app's behaviour. (It has since moved from Next.js to Vite + Cloudflare Pages in the same PR; the MCP viewer shares its Vite/Tailwind setup.)
- Mutating tools. Everything is read-only compute.

---

## 2. What the spike established

| Question | Result |
|---|---|
| Does `lib/` run on Workers? | ✅ Yes, no DOM or Node dependencies. |
| CPU cost per analysis | ✅ **~1.0–1.4 ms** per full sweep (131 states) measured on Node 22 (single pivot 1.43 ms, four bar 1.03 ms). Workers free plan allows ~10 ms CPU per request ❓ (verify current limit). |
| Size of a full `AnalysisResults` | 260–330 KB JSON. Over Claude's ~150k-char tool-result cap, so it is **never** sent over the wire. |
| How the UI gets data | ✅ The tool returns only the resolved `geometry` plus a ~4 KB summary. The viewer **re-runs `runKinematicAnalysis` in the iframe** (~1 ms). This also makes the compression sliders instant with no round-trips. |
| Stateless Streamable HTTP on Workers | ✅ `WebStandardStreamableHTTPServerTransport` ships in `@modelcontextprotocol/sdk` (1.32). No Express, no Durable Objects, no `agents` package needed. One server + transport per request. |
| Reusing the visualisation | ✅ `AnimationView` from `components/Visualization.tsx` renders as-is, including sliders. Needed: Tailwind `@source` for the shared dir, and a single React copy (see gotchas). |
| Bundle size | Viewer is one inlined HTML file, **~693 kB (184 kB gzip)**. Worker upload 2.2 MiB (441 KiB gzip) ❓ check against current script-size limit. |
| Existing CI unaffected | ✅ Root `tsc`, eslint and vitest exclude `mcp/`; the root checks still pass (143 tests). |

Local end-to-end check (wrangler dev + raw JSON-RPC): `tools/list`, `tools/call`
(single pivot and four bar), input validation errors, `resources/read`
(`text/html;profile=mcp-app`), and `GET /mcp` → 405 all behave as intended. The
viewer was screenshotted standalone with Playwright. **Not yet tested inside
Claude** (see §8).

---

## 3. Architecture

```
MCP client ──POST /mcp──▶ Worker (stateless)
                          ├─ rate limit (binding, per IP)
                          ├─ body size cap
                          ├─ McpServer + WebStandardStreamableHTTPServerTransport
                          │    ├─ tool  analyze_bike   (_meta.ui.resourceUri → ui://…)
                          │    └─ resource ui://mtb-suspension/viewer.html (inlined HTML)
                          └─ lib/kinematics.ts  (shared with the web app)

Claude host ──renders──▶ sandboxed iframe (viewer.html)
                          ├─ App.connect() → ontoolresult → structuredContent.geometry
                          ├─ runKinematicAnalysis(geometry)   (local, ~1 ms)
                          └─ AnimationView (shared SVG components)
```

```
mcp/
├── PLAN.md                this file
├── wrangler.jsonc         worker config, rate-limit binding, html-as-text rule
├── vite.config.ts         builds ui/viewer.html → dist/viewer.html (single file)
├── src/
│   ├── worker.ts          fetch handler: routing, rate limit, size cap, transport
│   ├── server.ts          McpServer: tool + UI resource; claudeUiDomain()
│   ├── schema.ts          zod input schema generated from a field table
│   ├── summary.ts         downsampled summary + NaN/throw → readable error
│   └── mcp.test.ts        in-memory client↔server tests
└── ui/
    ├── viewer.html / viewer.tsx   MCP App entry (React)
    └── styles.css                 Tailwind + slider CSS (mirrors app/globals.css)
```

`mcp/` is a separate npm package (own `package.json`/lockfile, own
`tsconfig`/`vitest`). It imports `../lib` and `../components` through the `@/`
alias, so there is no duplication and no publishing step.

---

## 4. Auth and abuse protection

Decision: **authless (`none`)**. Claude's connector docs list authless as a
supported type. There is no user data, and compute per request is bounded.

Layers (cheapest first):

1. **Bounded inputs.** Every numeric field has a min/max in `schema.ts`; the
   sweep length is fixed by `shockStroke` (max 100 mm → ≤ 201 steps at 0.5 mm).
   Worst-case request cost is therefore a few ms.
2. **Body cap.** 32 KB `Content-Length` limit → 413.
3. **Rate limiting.** Workers Rate Limiting binding (`RATE_LIMITER`), 60 req /
   60 s per `cf-connecting-ip`. Config-only, not billed per request. ✅ (config
   validated by `wrangler deploy --dry-run`). ❓ The binding is per-location and
   eventually consistent: it is a brake, not an exact quota.
4. **Hard cost ceiling (optional, 🔲).** Add a Cloudflare **WAF rate-limiting
   rule** or a Turnstile-free "global daily budget" if the Workers free plan's
   daily request cap is a concern. On the free plan requests past the cap fail
   rather than bill ❓ (confirm current behaviour in dashboard before relying on it).
5. **Stateless.** No sessions or storage, so nothing to leak or exhaust.

Rejected / deferred:

- **Email allowlist.** Needs a real OAuth authorization server (discovery,
  PKCE, DCR/CIMD, token endpoint, refresh rotation, reachable from Anthropic's
  egress range). Cloudflare Access can front this, but it is a lot of surface
  for a stateless calculator. Revisit only if abuse appears.
- **Static header secret.** The `static_headers` auth type is beta and limited
  to certain orgs ❓. A shared secret would also not keep out anyone who is allowed
  to use the connector.

Escalation path if abused: tighten the rate limit → add a WAF rule → add
Cloudflare Access/OAuth (§9).

---

## 5. Tool design

### 5.1 `analyze_bike` ✅ (spike)

- **Input:** every field optional, defaults from `createDefaultGeometry()`;
  45 properties: `suspensionType`, `idlerType`, plus all numeric geometry
  fields with ranges and defaults in the description. `totalTravel` is
  deliberately **excluded**: the engine does not use it (travel derives from
  shock stroke × leverage). Worth removing from `BikeGeometry` upstream.
- **Output:**
  - `content[0].text`: human-readable summary for the model.
  - `structuredContent`: `{ geometry, travelMM, atSag, atTopOut, atBottomOut, ranges, curves }`
    where `curves` is 21 evenly spaced samples of each metric (≈4 KB).
  - Errors (`isError`) for throws, empty results, or NaN/∞ in the output.
- **Annotations:** `readOnlyHint: true`, `openWorldHint: false`.

### 5.2 Planned tools

| Tool | Purpose | UI? | Phase |
|---|---|---|---|
| `list_presets` / preset arg on `analyze_bike` | A few reference bikes (single-pivot trail, four-bar enduro, idler bike) so the model need not invent 30 numbers | no | 2 |
| `compare_bikes` | 2–3 geometries → overlaid curves + delta table | yes (graph view) | 3 |
| `get_input_help` | Field glossary and coordinate conventions (BB origin, x forward, y up) | no | 2 |
| `sweep_parameter` | Vary one field over a range, return how a chosen metric changes | optional | 3 |

Keep tool count small. Each tool's description competes for the model's
attention. Prefer arguments over new tools where possible.

### 5.3 Known sharp edges to handle

- **Unsolvable geometry.** A bad shock ETE/stroke vs linkage can yield NaN or
  throw. Currently caught and reported generically. 🔲 Improve messages (e.g.
  tell the model which relationship is infeasible) and add tests for known-bad
  four-bar inputs.
- **Defaults look odd.** The default single-pivot bike reports anti-squat ≈ 360 %
  and front-centre ≈ 2910 mm in the visualisation. Not investigated (this is
  existing engine behaviour with the existing defaults), but a first-time user
  will see it. 🔲 Decide whether to ship better presets as the MCP default.
- **Input discoverability.** The model can't see ranges unless they're in the
  JSON schema (they are) and descriptions (they are). 🔲 Evaluate with real
  prompts; adjust wording.

---

## 6. UI (MCP App)

### 6.1 Spike ✅
`AnimationView` (bike + shock/fork sliders + working-lines toggle) fed from
`structuredContent.geometry`. Falls back to the default bike when opened
standalone (outside an iframe), which is how it is screenshot-tested.

### 6.2 Phase 2
- **Graphs tab.** `components/Graphs.tsx` (573 lines) is the likely reuse
  candidate; confirm it has no hooks/props tied to `useBikeViewModel`. Add a
  tab or segmented control: *Bike | Graphs*.
- **Host theming.** Respond to host context (light/dark, fonts) via
  `app.onhostcontextchanged` / CSS variables instead of only `prefers-color-scheme` ❓.
- **Display modes.** Inline by default; offer fullscreen/side-panel for the graphs ❓.
- **Marker for sag.** Initialise the slider at the sag point (30 %) ✅, and show
  the summary metrics beside the bike.
- **Loading / error states.** Show `isError` text; handle `ontoolinputpartial`
  streaming if worthwhile.
- **`ontoolinput`** to render a skeleton before results arrive ❓.

### 6.3 Phase 3
- `callServerTool` from the UI to re-analyse after in-view parameter edits
  (needs an app-only tool with `_meta.ui.visibility: ["app"]`; note this
  is not a security boundary).
- Compare view for `compare_bikes`.

### 6.4 Build gotchas (already hit)
- **Two React copies.** Shared components sit outside `mcp/` and resolve the root
  app's React → "Cannot read properties of null (reading 'useState')". Fixed with
  `resolve.alias` for `react`/`react-dom` in `vite.config.ts`. Keep this when
  adding any other singleton dependency.
- **Tailwind scanning.** Tailwind v4 only scans from the CSS file's directory;
  `ui/styles.css` adds `@source "../../components"`. New shared components
  must stay under that path or the source list needs extending.
- **Slider CSS** is duplicated from `app/globals.css`. 🔲 Extract to a shared
  partial if it drifts.
- **Iframe height.** The host sizes the iframe from the document's *intrinsic*
  height (the SDK's auto-resize measures `documentElement` with
  `height: max-content`). A `height: 100%` layout therefore collapses to a sliver
  in Claude (seen on first real run). The viewer now sets a definite height,
  `clamp(440px, 72vw, 680px)`, and has no `100%` height chain. Verified by
  loading it in a 120 px-tall viewport and measuring 440–680 px.
  🔲 Respect `hostContext.containerDimensions.maxHeight` and fullscreen display mode.
- **Bundle size** (~693 kB) is dominated by React + the `ext-apps` SDK + the
  kinematics code. Fine for now. ❓ Check whether Claude imposes a resource size limit.

### 6.5 CSP
The viewer is a single inlined HTML file with no external scripts, fonts, or
fetches, so **no `_meta.ui.csp` is declared** (default sandbox allows inline
scripts/styles). If external resources are ever added, list their origins in
`resourceDomains`. ❓ Confirm inline `<script type="module">` works in Claude's
iframe (the docs' own quickstart loads from `unpkg.com` via CSP, but also say
inline is allowed by default).

---

## 7. Deployment (Cloudflare)

### 7.1 Cost model
Workers free plan: requests are not billed; exceeding the daily cap makes
requests fail instead of charging ❓ (confirm). Stateless with no KV/D1/DO/R2, so no
other billable resources. Rate Limiting binding is free. Upgrade path:
Workers Paid ($5/mo, much higher CPU/request limits) only if the 10 ms CPU
ceiling proves too tight (measured ~1–1.5 ms locally, so ~7× headroom, but
Workers CPU ≠ Node CPU; measure on a deployed Worker with Workers Observability).

### 7.2 Steps
```bash
cd mcp
npm ci
npm run build:ui          # dist/viewer.html
npx wrangler login        # one-time
npm run deploy            # build + wrangler deploy
```
Claude's `ui.domain` is `<sha256(server URL)[:32]>.claudemcpcontent.com`
(`claudeUiDomain()`, unit-tested against the docs' example). The Worker computes it
**per request from its own origin** (`<origin>/mcp`), so production, custom
domains and every preview URL get the right value with no configuration. The
optional `PUBLIC_MCP_URL` var overrides this (e.g. behind a proxy).
Verified locally: `localhost:8788` and `127.0.0.1:8788` yield different, correct hashes.

### 7.3 CI/CD
- ✅ `.github/workflows/mcp.yml` on PRs touching `mcp/`, `lib/`, `components/`:
  build UI → typecheck → test → `wrangler deploy --dry-run`.
- ✅ `.github/workflows/mcp-deploy.yml`: **manual** (`workflow_dispatch`) deploy.
  Build → typecheck → test → `wrangler deploy`. Needs repo secrets
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
  - **Token permissions:** create a custom API token with a single permission,
    *Account → Workers Scripts → Edit*, scoped to just your account. No zone
    permissions are needed for a `workers.dev` URL; add *Zone → Workers Routes →
    Edit* (zone-scoped) only if you later attach a custom domain.
  - Setting `CLOUDFLARE_ACCOUNT_ID` lets wrangler skip the account lookup, so
    the token doesn't need account/user read permissions. ❓ If the first deploy
    errors on enabling the `workers.dev` subdomain, the dashboard (Workers &
    Pages → your Worker → Settings) can enable it once; avoid widening the token.
  - Avoid Cloudflare's "Edit Cloudflare Workers" template: it grants KV, R2, D1
    etc. this Worker doesn't use.
  - 🔲 Optionally gate the job with a GitHub Environment (required reviewers).
- ✅ `.github/workflows/mcp-preview.yml`: **per-PR preview** (same-repo PRs only).
  Runs `wrangler versions upload --preview-alias pr-<N>`, which uploads a new
  Worker *version* without changing production and serves it at a stable
  `pr-<N>-<worker>.<subdomain>.workers.dev` alias (free). A PR comment gives the
  `/mcp` URL to add as a custom connector.
  - Needs the same token (Workers Scripts: Edit) and `wrangler.jsonc`
    `preview_urls: true`. The Worker must exist first: run `mcp-deploy` once.
  - Previews share production's bindings, so they share the rate-limit counters
    (acceptable; the Worker is stateless).
  - ❓ Not yet run in CI. Check on first run: the preview-URL parsing of
    wrangler's output, that `versions upload` accepts the rate-limit binding,
    and that preview URLs are enabled for the Worker in the dashboard.
  - 🔲 No automatic cleanup: preview versions/aliases accumulate. Cloudflare
    keeps a bounded version history; revisit if aliases need pruning.
- 🔲 Worker-level test with `unstable_dev`/Miniflare for routing, 405/413/429.
  Currently covered only by manual curl; the unit tests exercise the server
  in-memory, not `worker.ts`.

### 7.4 Observability
Workers Observability (logs + metrics) on by default in the dashboard. 🔲 Add
structured one-line logs for: tool name, geometry type, analysis ms, outcome.
No geometry values need logging.

---

## 8. Verification still required (not done in the spike)

1. **Connect from Claude as a custom connector** via a tunnel or a deployed
   Worker, and confirm: tool appears, UI renders inline, structured content
   reaches the viewer, sliders work, dark mode looks right.
2. **Inline script/CSP** behaviour in Claude's sandbox (§6.5).
3. **Deployed CPU time** on the free plan (§7.1).
4. **Resource/bundle size limits** for the HTML resource and Worker script.
5. **Rate-limit binding** actually returns 429 after the threshold on a
   deployed Worker (local dev doesn't enforce it).
6. **SDK generation.** The spike uses the 1.x line (`sdk@1.32`, `ext-apps@1.7.5`),
   matching Claude's quickstart. The `ext-apps` repo's examples have moved to
   2.x (`@modelcontextprotocol/server` etc.); wire protocol is stated to be the
   same. Stay on 1.x until 2.x is documented for Claude; re-evaluate on upgrade.
7. **Other hosts.** `ext-apps` targets multiple hosts; only Claude is in scope
   but VS Code / ChatGPT may behave differently on theming and CSP.

---

## 9. Phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 – Spike ✅** | Worker, one tool, viewer, tests, CI, plan | Local end-to-end works; CPU measured |
| **1 – Ship privately** | Deploy to workers.dev, connect from Claude, fix whatever breaks (CSP, theming) | Works in Claude; deployed CPU < 5 ms; 429 verified |
| **2 – Usable** | Presets + `get_input_help`; Graphs tab; better error messages; structured logging; Worker-level tests | A fresh Claude conversation can produce a sensible analysis from "I have a 150 mm four-bar with a 30 % progressive leverage curve…" |
| **3 – Richer** | `compare_bikes`, `sweep_parameter`, in-view parameter edits via app-only tool | Compare view reviewed |
| **4 – Directory (optional)** | Submit to Claude's connector directory | Needs: privacy policy, docs, test accounts, review; the directory flow may require OAuth-free "none" to be acceptable ❓ |

Escalation if abuse or demand appears: stricter limits → WAF rules → Cloudflare
Access or OAuth (email allowlist) → Workers Paid.

---

## 10. Open questions for the maintainer

1. **Hosting identity.** Which Cloudflare account/subdomain, and is a custom
   domain wanted (affects `ui.domain`)?
2. **Deploy trigger.** On merge to `master`, manual, or tag?
3. **Presets.** Which reference bikes should ship (and should they replace the
   engine's current defaults, which give odd-looking numbers)?
4. **`totalTravel`.** Remove from `BikeGeometry` since the engine ignores it?
5. **Licence.** The repo is AGPL-3.0. A public hosted server must offer the
   source (include a source link in the server info / landing page, 🔲).
