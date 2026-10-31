#!/usr/bin/env node
// Repeatable preview audit (M8). Boots the Vite app, drives a real headless
// Chrome over the DevTools protocol, visits every catalog entry's preview
// route, captures screenshots/console/network failures, and writes a
// component-by-component report.
//
// Dependency-free by design: uses Node's built-in WebSocket (Node >= 22.12)
// and the Chrome/Edge binary already installed on the machine. No Playwright
// or Puppeteer dependency is added to the project.
//
// Usage:
//   npm run audit:previews
//   npm run audit:previews -- --only=react-bits-dome-gallery,alert
//   npm run audit:previews -- --base-url=http://127.0.0.1:5173
//
// Outputs:
//   audit/preview-audit.json      machine-readable results
//   audit/PREVIEW_AUDIT.md        human-readable report
//   audit/screenshots/<id>.jpg    captured preview frame per entry
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

async function main() {
const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Preview audit

Usage:
  npm run audit:previews
  npm run audit:previews -- --only=react-bits-dome-gallery,alert
  npm run audit:previews -- --base-url=http://127.0.0.1:5173
  npm run audit:previews -- --reduced-motion

Options:
  --only=<ids>        comma-separated catalog ids
  --base-url=<url>    use an already-running dev server
  --port=<number>     port for the self-started Vite server (default 5188)
  --viewport=<WxH>    emulate a viewport (default 1440x1000)
  --reduced-motion    emulate prefers-reduced-motion: reduce
  --help              show this help

Requires Node >= 22.12 (built-in WebSocket) and Chrome or Edge.`);
  return;
}
if (typeof WebSocket === "undefined") {
  fail("The preview audit requires Node >= 22.12 (built-in WebSocket).");
}
const only = args.only ? new Set(String(args.only).split(",").map((id) => id.trim()).filter(Boolean)) : null;
const port = Number(args.port ?? 5188);
const viewport = parseViewport(args.viewport);
const baseUrl = String(args["base-url"] ?? `http://127.0.0.1:${port}`).replace(/\/$/, "");
const outDir = resolve(ROOT, "audit");
const shotDir = join(outDir, "screenshots");
mkdirSync(shotDir, { recursive: true });

const catalog = JSON.parse(readFileSync(join(ROOT, "catalog", "catalog.json"), "utf8"));
const entries = catalog.entries.filter((entry) => !only || only.has(entry.id));
if (entries.length === 0) {
  fail(`No catalog entries matched --only=${args.only}`);
}

let server = null;
let chrome = null;
let cdp = null;
let sessionId = null;
let profileDir = null;
const startedAt = new Date();

try {
  if (!args["base-url"]) {
    const vite = join(ROOT, "node_modules", "vite", "bin", "vite.js");
    if (!existsSync(vite)) fail("Vite is not installed. Run npm install first.");
    server = spawn(process.execPath, [vite, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
      cwd: ROOT,
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForHttp(`${baseUrl}/`, 30_000);
  } else {
    await waitForHttp(`${baseUrl}/`, 10_000);
  }

  const chromePath = CHROME_CANDIDATES.find((candidate) => candidate && existsSync(candidate));
  if (!chromePath) {
    fail("Chrome or Edge was not found. Set CHROME_PATH to a Chromium-based browser binary.");
  }

  profileDir = join(tmpdir(), `rl-preview-audit-${process.pid}-${Date.now()}`);
  chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--mute-audio",
      "--hide-scrollbars",
      "--window-size=1440,1000",
      "--force-device-scale-factor=1",
      "--enable-unsafe-swiftshader",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  const browserWs = await waitForDevTools(profileDir, 20_000);
  cdp = await connectCDP(browserWs);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const attached = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  sessionId = attached.sessionId;

  const send = (method, params = {}) => cdp.send(method, params, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: AUDIT_BOOTSTRAP });
  if (args["reduced-motion"]) {
    await send("Emulation.setEmulatedMedia", {
      media: "",
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
  }

  const global = await evaluate(send, WEBGL_PROBE);
  const results = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const label = `[${String(index + 1).padStart(2, "0")}/${entries.length}] ${entry.id}`;
    process.stdout.write(`${label} … `);

    const events = { console: [], exceptions: [], log: [], network: [] };
    const stop = cdp.on((event) => {
      if (event.sessionId !== sessionId) return;
      const { method, params } = event;
      if (method === "Runtime.consoleAPICalled") {
        if (params.type === "error" || params.type === "warning") {
          events.console.push({
            level: params.type,
            text: params.args.map(argText).join(" ").slice(0, 1200),
          });
        }
      } else if (method === "Runtime.exceptionThrown") {
        events.exceptions.push(exceptionText(params.exceptionDetails));
      } else if (method === "Log.entryAdded") {
        if (params.entry.level === "error") {
          events.log.push(`${params.entry.text.slice(0, 1200)}${params.entry.url ? ` (${params.entry.url})` : ""}`);
        }
      } else if (method === "Network.loadingFailed") {
        if (!params.canceled) events.network.push(`${params.type}: ${params.errorText}`);
      } else if (method === "Network.responseReceived") {
        if (params.response.status >= 400 && isAsset(params.response.type)) {
          events.network.push(`HTTP ${params.response.status} ${params.response.url}`);
        }
      }
    });

    try {
      const route = `${baseUrl}/?audit=${Date.now()}-${index}#/preview/${entry.id}`;
      await send("Page.navigate", { url: route });
      await waitForLoad(cdp, sessionId, 12_000).catch(() => undefined);
      await waitForWorkspace(send, entry, 12_000);
      await sleep(1300);

      const metrics = await evaluate(send, METRICS_EXPRESSION);
      const shot = await capture(send, metrics.capture);
      await sleep(700);
      const shotLater = await capture(send, metrics.capture);
      const visuallyChanged = shot && shotLater && shot.hash !== shotLater.hash;

      // Honest external/unavailable cards are not live stages; do not probe
      // their rail as if pointer motion were a component interaction.
      const pointer = metrics.stage ? await exercisePointer(send, metrics.targetRect) : false;
      const shotInteraction = pointer ? await capture(send, metrics.capture) : null;
      const interactionChanged = Boolean(pointer && shotLater && shotInteraction && shotInteraction.hash !== shotLater.hash);

      const shotPath = join(shotDir, `${entry.id}.jpg`);
      if (shot?.data) writeFileSync(shotPath, Buffer.from(shot.data, "base64"));

      const result = classify(entry, metrics, events, {
        visuallyChanged,
        interactionChanged,
        pointerTested: Boolean(pointer),
        global,
        screenshot: `audit/screenshots/${entry.id}.jpg`,
      });
      results.push(result);
      process.stdout.write(`${result.status}\n`);
    } catch (error) {
      const result = {
        id: entry.id,
        name: entry.name,
        route: `#/preview/${entry.id}`,
        status: "untested",
        problems: [`audit failed: ${error instanceof Error ? error.message : String(error)}`],
        console: events.console,
        exceptions: events.exceptions,
        log: events.log,
        network: events.network,
      };
      results.push(result);
      process.stdout.write(`untested (${result.problems[0]})\n`);
    } finally {
      stop();
    }
  }

  let gallery = null;
  try {
    gallery = await auditGallery(send, baseUrl, results);
    const byId = new Map(gallery.items.map((item) => [item.id, item]));
    for (const result of results) result.gallery = byId.get(result.id) ?? null;
  } catch (error) {
    gallery = {
      checked: 0,
      summary: {
        checked: 0,
        ok: 0,
        poster: 0,
        snapshot: 0,
        external: 0,
        unavailable: 0,
        problems: [{ id: "*", status: "untested", problem: String(error) }],
      },
      items: [],
    };
  }

  const summary = summarize(results);
  summary.gallery = gallery.summary;
  const report = {
    generatedAt: new Date().toISOString(),
    startedAt: startedAt.toISOString(),
    baseUrl,
    browser: global,
    viewport,
    reducedMotion: Boolean(args["reduced-motion"]),
    summary,
    entries: results,
  };
  writeFileSync(join(outDir, "preview-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outDir, "PREVIEW_AUDIT.md"), renderMarkdown(report));
  console.log(`\nWrote audit/preview-audit.json and audit/PREVIEW_AUDIT.md (${results.length} entries).`);
  console.log(JSON.stringify(report.summary, null, 2));
} finally {
  try {
    if (cdp) cdp.close();
  } catch {
    // best effort
  }
  if (chrome && !chrome.killed) chrome.kill();
  if (server && !server.killed) server.kill();
  if (profileDir) {
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Chrome may still hold a file on Windows; the temp dir is disposable.
    }
  }
}

}

function parseArgs(argv) {
  const parsed = {};
  for (const raw of argv) {
    const arg = raw.replace(/^--/, "");
    const eq = arg.indexOf("=");
    if (eq === -1) parsed[arg] = true;
    else parsed[arg.slice(0, eq)] = arg.slice(eq + 1);
  }
  return parsed;
}

function parseViewport(value) {
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(String(value ?? "1440x1000"));
  if (!match) fail("--viewport must be <width>x<height>, e.g. --viewport=390x844");
  return { width: Number(match[1]), height: Number(match[2]) };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  fail(`Timed out waiting for ${url}`);
}

async function waitForDevTools(dir, timeoutMs) {
  const file = join(dir, "DevToolsActivePort");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(file)) {
      const [devtoolsPort, path] = readFileSync(file, "utf8").trim().split(/\r?\n/);
      if (devtoolsPort && path) return `ws://127.0.0.1:${devtoolsPort}${path}`;
    }
    await sleep(100);
  }
  fail("Chrome did not expose a DevTools endpoint.");
}

function waitForLoad(client, session, timeoutMs) {
  return new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, timeoutMs);
    const stop = client.on((event) => {
      if (event.sessionId === session && event.method === "Page.loadEventFired") {
        clearTimeout(timer);
        stop();
        resolvePromise();
      }
    });
  });
}

async function waitForWorkspace(send, entry, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await evaluate(send, {
      expression: `(() => {
        const workspace =
          document.querySelector('[data-testid="preview-workspace"]') ||
          document.querySelector('[data-testid="expanded-preview"]');
        if (!workspace) return null;
        return {
          label: workspace.getAttribute('aria-label') || '',
          stage: Boolean(document.querySelector('[data-testid="preview-stage"]')),
          honest: Boolean(document.querySelector('[data-testid="preview-honest"]')),
          error: Boolean(document.querySelector('[data-testid="preview-stage-error"]')),
          loadError: Boolean(document.querySelector('[data-testid="preview-load-error"]')),
          loading: document.body.innerText.includes('Loading preview…'),
        };
      })()`,
    });
    if (state && state.label.includes(entry.name) && (state.stage || state.honest || state.error || state.loadError)) {
      return state;
    }
    await sleep(100);
  }
  return null;
}

async function capture(send, clip) {
  if (!clip || clip.width < 2 || clip.height < 2) return null;
  const result = await send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 78,
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { ...clip, scale: 1 },
  });
  const data = result.data;
  return { data, hash: createHash("sha1").update(data).digest("hex") };
}

async function waitForGallery(send, expected, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await evaluate(send, "document.querySelectorAll('[data-entry-id]').length");
    if (Number(count) >= expected) return;
    await sleep(250);
  }
  throw new Error(`Gallery did not render ${expected} cards`);
}

const GALLERY_STATE = (id) => `(() => {
  const card = document.querySelector(${JSON.stringify(`[data-entry-id="${id}"]`)});
  if (!card) return { found: false };
  card.scrollIntoView({ block: "center" });
  const frame = card.querySelector(".preview-frame");
  const shell = card.querySelector(".preview-shell");
  const visual = shell || frame || card.querySelector(".gallery-card-preview");
  const images = visual ? [...visual.querySelectorAll("img")] : [];
  return {
    found: true,
    kind: card.getAttribute("data-preview-kind"),
    renderedKind: frame?.getAttribute("data-preview-kind") ?? null,
    played: Boolean(card.querySelector(".preview-mini-stage")) ? "true" : "false",
    heavy: card.closest("li")?.querySelector(".gallery-preview-status")?.getAttribute("data-cost") ?? null,
    frameHeight: visual ? Math.round(visual.getBoundingClientRect().height) : 0,
    canvases: visual?.querySelectorAll("canvas").length ?? 0,
    images: images.length,
    brokenImages: images.filter((img) => !img.complete || img.naturalWidth === 0).length,
    mini: Boolean(card.querySelector(".preview-mini-stage")),
    snapshot: Boolean(card.querySelector(".preview-frame.is-snapshot")),
    external: Boolean(card.querySelector(".preview-frame.is-external")),
    empty: Boolean(card.querySelector(".preview-frame.is-empty")),
    text: (visual?.innerText ?? "").replace(/\\s+/g, " ").trim().slice(0, 80),
  };
})()`;

async function auditGallery(send, baseUrl, results) {
  await send("Page.navigate", { url: `${baseUrl}/?audit=gallery-${Date.now()}#/gallery` });
  await waitForGallery(send, results.length, 15_000);
  const items = [];
  for (const result of results) {
    let after;
    try {
      after = await evaluate(send, GALLERY_STATE(result.id));
    } catch (error) {
      items.push({ id: result.id, status: "untested", problem: String(error) });
      continue;
    }
    if (!after?.found) {
      items.push({ id: result.id, status: "missing", problem: "gallery card not found" });
      continue;
    }
    // Cards mount live stages asynchronously after they become visible.
    await sleep(650);
    if (result.autoplayAllowed && !result.heavy) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        after = await evaluate(send, GALLERY_STATE(result.id));
        if (after?.mini) break;
        await sleep(250);
      }
    }
    after = await evaluate(send, GALLERY_STATE(result.id));
    const item = {
      id: result.id,
      kind: after.kind,
      renderedKind: after.renderedKind,
      heavy: Boolean(result.heavy),
      played: after.played === "true",
      frameHeight: after.frameHeight,
      canvases: after.canvases,
      images: after.images,
      brokenImages: after.brokenImages,
      miniStage: after.mini,
      snapshot: after.snapshot,
      external: after.external,
      empty: after.empty,
      text: after.text,
    };
    if (item.brokenImages > 0) item.status = "broken-image";
    else if (item.heavy) item.status = "poster";
    else if (after.kind === "external" || after.renderedKind === "external") item.status = "external-or-seeded";
    else if (after.kind === "local-demo" || after.kind === "local") {
      if (item.miniStage) item.status = "ok";
      else if (item.snapshot && !result.autoplayAllowed) item.status = "snapshot";
      else item.status = "play-failed";
    } else if (after.kind === "none" || result.previewStatus === "unavailable") item.status = "unavailable";
    else item.status = "external-or-seeded";
    items.push(item);
  }
  const problems = items.filter((item) => ["missing", "broken-image", "play-failed", "untested"].includes(item.status));
  return {
    checked: items.length,
    summary: {
      checked: items.length,
      ok: items.filter((item) => item.status === "ok").length,
      poster: items.filter((item) => item.status === "poster").length,
      snapshot: items.filter((item) => item.status === "snapshot").length,
      external: items.filter((item) => item.status === "external-or-seeded").length,
      unavailable: items.filter((item) => item.status === "unavailable").length,
      problems: problems.map((item) => ({ id: item.id, status: item.status, problem: item.problem ?? "check gallery item" })),
    },
    items,
  };
}

async function exercisePointer(send, rect) {
  if (!rect || rect.width < 20 || rect.height < 20) return false;
  const clampX = (value) => Math.max(8, Math.min(1430, value));
  const clampY = (value) => Math.max(8, Math.min(980, value));
  const point = (fx, fy) => ({
    x: clampX(rect.x + rect.width * fx),
    y: clampY(rect.y + rect.height * fy),
  });
  const moves = [point(0.2, 0.5), point(0.5, 0.42), point(0.78, 0.58), point(0.38, 0.68)];
  try {
    for (const { x, y } of moves) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", buttons: 0 });
      await sleep(70);
    }
    const press = point(0.5, 0.5);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: press.x, y: press.y, button: "left", buttons: 1, clickCount: 1 });
    await sleep(80);
    const drag = point(0.72, 0.62);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: drag.x, y: drag.y, button: "left", buttons: 1 });
    await sleep(80);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: drag.x, y: drag.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(350);
    return true;
  } catch {
    return false;
  }
}

function argText(arg) {
  if (arg.value !== undefined) return String(arg.value);
  return arg.description ?? arg.type ?? "";
}

function exceptionText(details) {
  const exception = details?.exception;
  return String(exception?.description ?? exception?.value ?? details?.text ?? "Unknown exception").slice(0, 1600);
}

function isAsset(type) {
  return type === "Script" || type === "Stylesheet" || type === "Image" || type === "Font" || type === "XHR" || type === "Fetch";
}

async function evaluate(send, descriptor) {
  const result = await send("Runtime.evaluate", {
    expression: typeof descriptor === "string" ? descriptor : descriptor.expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(exceptionText(result.exceptionDetails));
  }
  return result.result?.value;
}

function classify(entry, metrics, events, extra) {
  const problems = [];
  const ex = [
    ...events.exceptions,
    ...events.log.filter((line) => !/favicon/i.test(line)),
    ...events.console.filter((item) => item.level === "error").map((item) => item.text),
  ];
  const fatalNetwork = events.network.filter(
    (line) => !/ERR_ABORTED|ERR_BLOCKED_BY_CLIENT|favicon/i.test(line),
  );
  const previewType = entry.preview?.type ?? "seeded";

  if (metrics.loadError) problems.push("preview workspace chunk failed to load");
  if (metrics.stageError) problems.push(`stage threw: ${metrics.stageError}`);
  if (!metrics.stage && !metrics.honest) problems.push("no stage or honest fallback rendered");
  if (metrics.stage) {
    if (metrics.blank) problems.push("stage renders no visible text, canvas, image, svg or background");
    if (metrics.rootZero) problems.push("component root has zero height");
    if (metrics.collapsedContent > 0 && metrics.collapsedContent >= metrics.meaningful) problems.push(`content is collapsed inside a zero-height ancestor (${metrics.collapsedContent} element(s))`);
    if (metrics.stageHeight < 40) problems.push(`stage collapsed to ${metrics.stageHeight}px`);
    if (metrics.clippedCount > 0) problems.push(`${metrics.clippedCount} visible element(s) extend outside the stage canvas`);
    if (metrics.brokenImages.length > 0) problems.push(`broken image asset(s): ${metrics.brokenImages.slice(0, 3).join(", ")}`);
    if (metrics.contextLostCanvases > 0) problems.push(`${metrics.contextLostCanvases} WebGL canvas context(s) lost`);
    if (metrics.offscreenContent) problems.push("primary content starts outside the visible stage viewport");
  }
  if (ex.length > 0) problems.push(`${ex.length} console/runtime error(s)`);
  if (fatalNetwork.length > 0) problems.push(`failed request(s): ${fatalNetwork.slice(0, 2).join("; ")}`);

  let status;
  if (!metrics.stage && metrics.honest) {
    status = previewType === "none" ? "unavailable" : "external-reference";
  } else if (metrics.requiresWebGL && !extra.global.webgl2 && !extra.global.webgl1) {
    // Machine capability, not a code defect: keep it out of requires-repair.
    status = "requires-environment";
  } else if (problems.length > 0) {
    status = "requires-repair";
  } else if (entry.heavy || metrics.scrollStage) {
    status = "workspace-only";
  } else {
    status = "working";
  }

  if (status === "requires-repair") {
    if (extra.global.webgl2 || extra.global.webgl1) {
      // Keep the machine capability in the report without treating it as the cause.
    } else if (metrics.canvasCount > 0) {
      problems.push("WebGL is unavailable in this browser; a software fallback may be required");
    }
  }

  return {
    id: entry.id,
    name: entry.name,
    route: `#/preview/${entry.id}`,
    previewType,
    previewStatus: entry.previewProfile?.previewStatus ?? previewType,
    previewMode: entry.previewProfile?.mode ?? null,
    previewCost: entry.previewProfile?.cost ?? null,
    autoplayAllowed: Boolean(entry.previewProfile?.autoplayAllowed),
    source: entry.source ?? "",
    runtime: entry.runtime ?? "",
    heavy: Boolean(entry.heavy),
    behaviors: entry.behaviors ?? [],
    status,
    problems,
    runtimeRequirements: {
      runtime: entry.runtime ?? null,
      heavy: Boolean(entry.heavy),
      behavior: entry.behaviors ?? [],
      webgl: metrics.requiresWebGL,
      canvas: metrics.canvasCount,
      scrollStage: metrics.scrollStage,
      viewport: { stageWidth: metrics.stageWidth, stageHeight: metrics.stageHeight, wrapHeight: metrics.wrapHeight },
    },
    metrics: {
      ...metrics,
      webglGlobal: extra.global,
      visuallyChanged: extra.visuallyChanged,
      interactionChanged: extra.interactionChanged,
      pointerTested: extra.pointerTested,
    },
    console: events.console,
    exceptions: events.exceptions,
    log: events.log,
    network: events.network,
    screenshot: extra.screenshot,
    recommendedRepair: recommendation(status, problems, metrics),
  };
}

function recommendation(status, problems, metrics) {
  if (status === "external-reference") return "External preview only; the official source renders it. Keep the honest external card and official link.";
  if (status === "unavailable") return "Register a source/link or a verified local demo; otherwise keep the honest unavailable card.";
  if (status === "working") return "No repair required.";
  if (status === "workspace-only") return "Working in the expanded workspace; keep the gallery poster/heavy gating.";
  if (status === "requires-environment") return "Requires WebGL; keep the stage error fallback and document the requirement.";
  if (problems.some((problem) => /zero height|collapsed/i.test(problem))) {
    return "Give the showcase wrapper an explicit height (the component uses percentage height) and retest at all viewports.";
  }
  if (problems.some((problem) => /broken image/i.test(problem))) {
    return "Replace missing asset URLs with local data/blob assets or correct the import path.";
  }
  if (problems.some((problem) => /outside the stage/i.test(problem))) {
    return "Constrain overflow/scaling in the showcase wrapper or increase the stage canvas for this component.";
  }
  if (problems.some((problem) => /console|request/i.test(problem))) {
    return "Fix the first runtime/network error, then rerun the audit.";
  }
  if (metrics.scrollStage) return "Verify the inner-scroll stage starts with the primary content visible.";
  return "Inspect the captured screenshot and the console details in preview-audit.json.";
}

function summarize(results) {
  const summary = { total: results.length, byStatus: {} };
  for (const result of results) {
    summary.byStatus[result.status] = (summary.byStatus[result.status] ?? 0) + 1;
  }
  summary.requiresRepair = results.filter((result) => result.status === "requires-repair").map((result) => result.id);
  summary.workspaceOnly = results.filter((result) => result.status === "workspace-only").map((result) => result.id);
  summary.interactionOnly = results
    .filter((result) => result.metrics?.pointerTested && result.metrics.interactionChanged && !result.metrics.visuallyChanged)
    .map((result) => result.id);
  summary.noVisibleChange = results
    .filter((result) => result.metrics?.pointerTested && !result.metrics.visuallyChanged && !result.metrics.interactionChanged)
    .map((result) => result.id);
  return summary;
}

function renderMarkdown(report) {
  const lines = [
    "# Preview audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Browser: ${report.browser.name} · WebGL2: ${report.browser.webgl2 ? "yes" : "no"} · WebGL1: ${report.browser.webgl1 ? "yes" : "no"} · Renderer: ${report.browser.renderer ?? "unknown"}`,
    "",
    "## Summary",
    "",
    `Reduced motion emulation: ${report.reducedMotion ? "yes" : "no"}`,
    "",
  ];
  for (const [status, count] of Object.entries(report.summary.byStatus)) {
    lines.push(`- **${status}**: ${count}`);
  }
  if (report.summary.gallery) {
    const gallery = report.summary.gallery;
    lines.push(
      "",
      "### Gallery mini-stages",
      "",
      `Checked ${gallery.checked} cards: ${gallery.ok} live, ${gallery.poster} heavy posters, ${gallery.snapshot} snapshots, ${gallery.external} external/seeded, ${gallery.unavailable} unavailable, ${gallery.problems.length} problem(s).`,
    );
    for (const problem of gallery.problems) {
      lines.push(`- \`${problem.id}\`: ${problem.status} — ${problem.problem}`);
    }
  }
  lines.push("", "## Entries", "", "| Component | Status | Gallery | Motion | Problems | Recommended repair |", "|---|---|---|---|---|---|");
  for (const entry of report.entries) {
    const problems = entry.problems.length > 0 ? entry.problems.join("; ") : "—";
    const motion = entry.metrics?.visuallyChanged
      ? "autoplay"
      : entry.metrics?.interactionChanged
        ? "pointer"
        : "static";
    const gallery = entry.gallery?.status ?? "—";
    lines.push(`| \`${entry.id}\` | ${entry.status} | ${gallery} | ${motion} | ${escapeCell(problems)} | ${escapeCell(entry.recommendedRepair)} |`);
  }
  lines.push("", "Screenshots: `audit/screenshots/<id>.jpg`. Full console/network details: `audit/preview-audit.json`.", "");
  if (report.summary.interactionOnly?.length) {
    lines.push(`Pointer-only motion (expected for cursor/hover/click effects): ${report.summary.interactionOnly.join(", ")}.`, "");
  }
  if (report.summary.noVisibleChange?.length) {
    lines.push(`No visible change during autoplay or the pointer sweep: ${report.summary.noVisibleChange.join(", ")}.`, "");
  }
  return lines.join("\n");
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

const AUDIT_BOOTSTRAP = `(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
    const context = original.call(this, type, ...rest);
    if (context && /webgl/i.test(String(type))) this.setAttribute("data-audit-gl", String(type));
    return context;
  };
})();`;

const WEBGL_PROBE = `(() => {
  const out = { name: navigator.userAgent, webgl2: false, webgl1: false, renderer: null };
  try {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    out.webgl2 = Boolean(gl2);
    if (gl2) {
      const info = gl2.getExtension("WEBGL_debug_renderer_info");
      out.renderer = info ? gl2.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl2.getParameter(gl2.RENDERER);
    } else {
      const gl1 = canvas.getContext("webgl");
      out.webgl1 = Boolean(gl1);
      if (gl1) {
        const info = gl1.getExtension("WEBGL_debug_renderer_info");
        out.renderer = info ? gl1.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl1.getParameter(gl1.RENDERER);
      }
    }
  } catch (error) {
    out.error = String(error);
  }
  return out;
})()`;

const METRICS_EXPRESSION = `(() => {
  const stage = document.querySelector('[data-testid="preview-stage"]');
  const wrap = document.querySelector('[data-testid="preview-stage-wrap"]');
  const honest = document.querySelector('[data-testid="preview-honest"]');
  const stageError = document.querySelector('[data-testid="preview-stage-error"]');
  const loadError = document.querySelector('[data-testid="preview-load-error"]');
  const target = stage || honest;
  const targetRect = target ? target.getBoundingClientRect() : null;
  const rectOf = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
  };
  const stageRect = rectOf(stage);
  const wrapRect = rectOf(wrap);
  const captureRect = rectOf(wrap || honest);
  const visible = (element) => {
    const cs = getComputedStyle(element);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };
  const all = stage ? [stage, ...stage.querySelectorAll('*')] : [];
  const isScroll = wrap ? wrap.getAttribute('data-scroll') === 'true' : false;
  let zero = 0;
  let visibleCount = 0;
  let clippedCount = 0;
  const clippedExamples = [];
  let textLength = 0;
  let images = 0;
  let imagePixels = 0;
  const brokenImages = [];
  const canvases = [];
  let svgCount = 0;
  let meaningful = 0;
  let collapsedContent = 0;
  let backgroundCount = 0;
  let focusables = 0;
  let contentRect = null;
  const collapsedAncestor = (element) => {
    let parent = element.parentElement;
    while (parent && parent !== stage) {
      const rect = parent.getBoundingClientRect();
      const cs = getComputedStyle(parent);
      // 3D stages (e.g. a dome sphere) intentionally use zero-sized,
      // transformed parents with visible overflow; those are not collapsed.
      if (cs.transform === 'none' && (rect.height < 2 || rect.width < 2)) return true;
      parent = parent.parentElement;
    }
    return false;
  };
  const clippedByAncestor = (element) => {
    let parent = element.parentElement;
    while (parent && parent !== stage) {
      const cs = getComputedStyle(parent);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflow + ' ' + cs.overflowX + ' ' + cs.overflowY)) return true;
      parent = parent.parentElement;
    }
    return false;
  };
  const union = (a, b) => !a ? b : (!b ? a : {
    x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
    right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom),
    width: Math.max(a.right, b.right) - Math.min(a.x, b.x),
    height: Math.max(a.bottom, b.bottom) - Math.min(a.y, b.y),
  });
  for (const element of all) {
    if (!visible(element)) {
      const rect = element.getBoundingClientRect();
      if (rect.width * rect.height < 4) zero += 1;
      continue;
    }
    visibleCount += 1;
    const rect = element.getBoundingClientRect();
    if (!isScroll && !clippedByAncestor(element) && wrapRect && (rect.right > wrapRect.right + 8 || rect.bottom > wrapRect.bottom + 8 || rect.left < wrapRect.left - 8 || rect.top < wrapRect.top - 8)) {
      clippedCount += 1;
      if (clippedExamples.length < 6) {
        clippedExamples.push(element.tagName.toLowerCase() + '.' + String(element.className || '').split(' ').filter(Boolean).slice(0, 2).join('.'));
      }
    }
    const cs = getComputedStyle(element);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') backgroundCount += 1;
    if (element.tagName === 'CANVAS') {
      let contextLost = null;
      try {
        const gl = element.getContext('webgl2') || element.getContext('webgl');
        contextLost = gl ? gl.isContextLost() : null;
      } catch {
        contextLost = null;
      }
      canvases.push({
        context: element.getAttribute('data-audit-gl') || 'unknown',
        contextLost,
        width: element.width, height: element.height,
        clientWidth: Math.round(rect.width), clientHeight: Math.round(rect.height),
      });
      meaningful += 1;
      if (collapsedAncestor(element)) collapsedContent += 1;
    }
    if (element.tagName === 'svg') {
      svgCount += 1;
      if (rect.width > 4 && rect.height > 4) {
        meaningful += 1;
        if (collapsedAncestor(element)) collapsedContent += 1;
      }
    }
    if (element.tagName === 'IMG') {
      images += 1;
      const area = rect.width * rect.height;
      if (area > 16) {
        imagePixels += area;
        meaningful += 1;
        if (collapsedAncestor(element)) collapsedContent += 1;
      }
      if (!element.complete || element.naturalWidth === 0) brokenImages.push(String(element.getAttribute('src') || '').slice(0, 120));
    }
    if (element.tabIndex >= 0 || ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) focusables += 1;
    const isTextLeaf = element.childElementCount === 0 && (element.textContent || '').trim().length > 0;
    if (isTextLeaf && !['SCRIPT', 'STYLE'].includes(element.tagName)) {
      textLength += (element.textContent || '').trim().length;
      const range = document.createRange();
      range.selectNodeContents(element);
      const textRect = range.getBoundingClientRect();
      if (textRect.width > 1 && textRect.height > 1) {
        meaningful += 1;
        if (collapsedAncestor(element)) collapsedContent += 1;
        contentRect = union(contentRect, textRect);
      }
    }
  }
  const root = stage ? stage.firstElementChild : null;
  const rootRect = rectOf(root);
  const scrollStage = wrap ? wrap.getAttribute('data-scroll') === 'true' : false;
  const offscreenContent = Boolean(scrollStage && contentRect && wrapRect && (contentRect.y > wrapRect.bottom - 4 || contentRect.bottom < wrapRect.top + 4));
  const blank = Boolean(stage && (meaningful === 0 ? backgroundCount === 0 : collapsedContent >= meaningful));
  const scrollHeight = wrap ? wrap.scrollHeight : 0;
  const clientHeight = wrap ? wrap.clientHeight : 0;
  return {
    stage: Boolean(stage), honest: Boolean(honest), stageError: stageError ? stageError.innerText.slice(0, 500) : null,
    loadError: loadError ? loadError.innerText.slice(0, 500) : null,
    targetRect: targetRect ? { x: targetRect.x, y: targetRect.y, width: targetRect.width, height: targetRect.height } : null,
    stageWidth: stageRect ? Math.round(stageRect.width) : 0,
    stageHeight: stageRect ? Math.round(stageRect.height) : 0,
    wrapHeight: wrapRect ? Math.round(wrapRect.height) : 0,
    scrollStage, scrollHeight, clientHeight, scrollable: scrollHeight > clientHeight + 4,
    blank, meaningful, collapsedContent, zero, visibleCount, clippedCount, clippedExamples,
    textLength, images, imagePixels, brokenImages: brokenImages.slice(0, 10), svgCount, backgroundCount, focusables,
    canvasCount: canvases.length, canvases,
    contextLostCanvases: canvases.filter((canvas) => canvas.contextLost).length,
    rootZero: Boolean(rootRect && rootRect.height < 2 && stageRect && stageRect.height > 40),
    contentTop: contentRect ? Math.round(contentRect.y) : null,
    contentBottom: contentRect ? Math.round(contentRect.bottom) : null,
    offscreenContent,
    requiresWebGL: canvases.some((canvas) => /webgl/i.test(canvas.context)),
    capture: captureRect ? { x: Math.max(0, captureRect.x), y: Math.max(0, captureRect.y), width: Math.max(0, Math.min(captureRect.width, 1434)), height: Math.max(0, Math.min(captureRect.height, 980)) } : null
  };
})()`;

/** Minimal DevTools protocol client over Node's built-in WebSocket. */
async function connectCDP(url) {
  const socket = new WebSocket(url);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", () => rejectPromise(new Error(`WebSocket failed: ${url}`)), { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener("message", (message) => {
    let payload;
    try {
      payload = JSON.parse(String(message.data));
    } catch {
      return;
    }
    if (payload.id) {
      const waiter = pending.get(payload.id);
      if (!waiter) return;
      pending.delete(payload.id);
      if (payload.error) waiter.reject(new Error(`${waiter.method}: ${payload.error.message}`));
      else waiter.resolve(payload.result);
    } else if (payload.method) {
      for (const listener of listeners) listener(payload);
    }
  });
  return {
    send(method, params = {}, sessionId) {
      return new Promise((resolvePromise, rejectPromise) => {
        const id = ++nextId;
        pending.set(id, { resolve: resolvePromise, reject: rejectPromise, method });
        socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
      });
    },
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      socket.close();
    },
  };
}

await main();
