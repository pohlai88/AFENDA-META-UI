import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROOT_ENV_CONFIG = path.join(ROOT, ".env.config");
const ROOT_ENV_EXAMPLE = path.join(ROOT, ".env.example");
const ROOT_ENV = path.join(ROOT, ".env");
const API_ENV = path.join(ROOT, "apps", "api", ".env");
const WEB_ENV_DEV = path.join(ROOT, "apps", "web", ".env.development");

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

function resolveSource() {
  if (fs.existsSync(ROOT_ENV_CONFIG)) {
    return { path: ROOT_ENV_CONFIG, kind: "config" };
  }

  if (fs.existsSync(ROOT_ENV)) {
    return { path: ROOT_ENV, kind: "env" };
  }

  if (fs.existsSync(ROOT_ENV_EXAMPLE)) {
    return { path: ROOT_ENV_EXAMPLE, kind: "example" };
  }

  throw new Error("No env source found. Expected one of: .env.config, .env, .env.example");
}

function parseEnv(content) {
  const entries = [];
  const map = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = rawLine.indexOf("=");
    if (eq <= 0) continue;

    const key = rawLine.slice(0, eq).trim();
    const value = rawLine.slice(eq + 1);
    entries.push([key, value]);
    map.set(key, value);
  }

  return { entries, map };
}

function upsertEntry(entries, key, value) {
  let found = false;
  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i][0] === key) {
      entries[i] = [key, value];
      found = true;
    }
  }

  if (!found) {
    entries.push([key, value]);
  }
}

function dedupeEntriesKeepLast(entries) {
  const lastIndex = new Map();
  for (let i = 0; i < entries.length; i += 1) {
    lastIndex.set(entries[i][0], i);
  }

  return entries.filter(([key], index) => lastIndex.get(key) === index);
}

function toEnvText(header, entries) {
  const body = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  return `${header}\n${body}\n`;
}

function writeIfChanged(target, nextContent) {
  const prev = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (prev !== nextContent) {
    fs.writeFileSync(target, nextContent, "utf8");
    return true;
  }
  return false;
}

function main() {
  const sourceInfo = resolveSource();
  ensureFile(sourceInfo.path);

  const source = fs.readFileSync(sourceInfo.path, "utf8");
  const { entries: sourceEntries, map: sourceMap } = parseEnv(source);

  const apiPrevText = fs.existsSync(API_ENV) ? fs.readFileSync(API_ENV, "utf8") : "";
  const webPrevText = fs.existsSync(WEB_ENV_DEV) ? fs.readFileSync(WEB_ENV_DEV, "utf8") : "";
  const apiPrev = parseEnv(apiPrevText).map;
  const webPrev = parseEnv(webPrevText).map;

  let rootChanged = false;
  if (sourceInfo.kind === "config") {
    rootChanged = writeIfChanged(ROOT_ENV, `${source.trimEnd()}\n`);
  } else if (sourceInfo.kind === "example" && !fs.existsSync(ROOT_ENV)) {
    rootChanged = writeIfChanged(ROOT_ENV, `${source.trimEnd()}\n`);
  }

  const apiEntries = [...sourceEntries];
  const apiPort = sourceMap.get("API_PORT") ?? apiPrev.get("PORT") ?? "4001";
  const uploadProvider =
    sourceMap.get("UPLOAD_STORAGE_PROVIDER") ??
    sourceMap.get("STORAGE_PROVIDER") ??
    apiPrev.get("UPLOAD_STORAGE_PROVIDER") ??
    "local";
  const jwtSecret =
    sourceMap.get("JWT_SECRET") ?? apiPrev.get("JWT_SECRET") ?? "change-me-in-production";
  const allowedOrigins =
    sourceMap.get("ALLOWED_ORIGINS") ?? apiPrev.get("ALLOWED_ORIGINS") ?? "http://localhost:5173";

  upsertEntry(apiEntries, "PORT", apiPort);
  upsertEntry(apiEntries, "UPLOAD_STORAGE_PROVIDER", uploadProvider);
  upsertEntry(apiEntries, "JWT_SECRET", jwtSecret);
  upsertEntry(apiEntries, "ALLOWED_ORIGINS", allowedOrigins);

  const apiHeader = `# Auto-generated from ${path.basename(sourceInfo.path)}. Run: pnpm env:sync`;
  const apiChanged = writeIfChanged(
    API_ENV,
    toEnvText(apiHeader, dedupeEntriesKeepLast(apiEntries))
  );

  const webApiUrl = (() => {
    if (sourceMap.has("VITE_API_URL")) return sourceMap.get("VITE_API_URL");
    if (sourceMap.has("API_PORT")) return `http://localhost:${sourceMap.get("API_PORT")}`;
    if (sourceMap.has("NEXT_PUBLIC_API_URL")) return sourceMap.get("NEXT_PUBLIC_API_URL");
    return webPrev.get("VITE_API_URL") ?? "http://localhost:4001";
  })();

  const webAppTitle =
    sourceMap.get("VITE_APP_TITLE") ?? webPrev.get("VITE_APP_TITLE") ?? "AFENDA (Dev)";
  const webAppEnv = sourceMap.get("VITE_APP_ENV") ?? webPrev.get("VITE_APP_ENV") ?? "development";

  const webEntries = [
    ["VITE_API_URL", webApiUrl],
    ["VITE_APP_TITLE", webAppTitle],
    ["VITE_APP_ENV", webAppEnv],
    [
      "VITE_NOTIFICATION_TOAST_DEDUPE_MS",
      sourceMap.get("VITE_NOTIFICATION_TOAST_DEDUPE_MS") ??
        webPrev.get("VITE_NOTIFICATION_TOAST_DEDUPE_MS") ??
        "2500",
    ],
    [
      "VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT",
      sourceMap.get("VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT") ??
        webPrev.get("VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT") ??
        "/meta/bootstrap",
    ],
    [
      "VITE_ANALYTICS_PROVIDERS",
      sourceMap.get("VITE_ANALYTICS_PROVIDERS") ??
        webPrev.get("VITE_ANALYTICS_PROVIDERS") ??
        "console",
    ],
    [
      "VITE_ANALYTICS_BATCH_SIZE",
      sourceMap.get("VITE_ANALYTICS_BATCH_SIZE") ?? webPrev.get("VITE_ANALYTICS_BATCH_SIZE") ?? "5",
    ],
    [
      "VITE_ANALYTICS_FLUSH_INTERVAL_MS",
      sourceMap.get("VITE_ANALYTICS_FLUSH_INTERVAL_MS") ??
        webPrev.get("VITE_ANALYTICS_FLUSH_INTERVAL_MS") ??
        "2000",
    ],
  ];

  const webHeader = `# Auto-generated from ${path.basename(sourceInfo.path)}. Run: pnpm env:sync`;
  const webChanged = writeIfChanged(WEB_ENV_DEV, toEnvText(webHeader, webEntries));

  const changed = [
    [".env", rootChanged],
    ["apps/api/.env", apiChanged],
    ["apps/web/.env.development", webChanged],
  ]
    .filter(([, didChange]) => didChange)
    .map(([name]) => name);

  if (changed.length === 0) {
    console.log("Environment files are already in sync.");
    return;
  }

  console.log(`Synced environment files: ${changed.join(", ")}`);
}

main();
