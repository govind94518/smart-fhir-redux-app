import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const cacache = require("/opt/homebrew/lib/node_modules/npm/node_modules/cacache");
const semver = require("/opt/homebrew/lib/node_modules/npm/node_modules/semver");
const tar = require("/opt/homebrew/lib/node_modules/npm/node_modules/tar");

const projectRoot = path.resolve(import.meta.dirname, "..");
const cacheDir = path.join(os.homedir(), ".npm", "_cacache");
const nodeModules = path.join(projectRoot, "node_modules");
const rootPackageJson = JSON.parse(await fs.readFile(path.join(projectRoot, "package.json"), "utf8"));
const cacheIndex = await readCacheIndex();
const installed = new Set();
const missingOptional = [];

await fs.mkdir(nodeModules, { recursive: true });

for (const [name, range] of Object.entries({
  ...rootPackageJson.dependencies,
  ...rootPackageJson.devDependencies,
})) {
  await installPackage(name, range, false);
}

if (missingOptional.length) {
  console.log(`Skipped ${missingOptional.length} optional cached packages that are not needed on this platform.`);
}

console.log("Installed packages from local npm cache.");

async function readCacheIndex() {
  const entries = await cacache.ls(cacheDir);
  const packages = new Map();

  for (const [key] of Object.entries(entries)) {
    const parsed = parseTarballKey(key);
    if (!parsed) {
      continue;
    }

    const versions = packages.get(parsed.name) ?? new Map();
    versions.set(parsed.version, key);
    packages.set(parsed.name, versions);
  }

  return packages;
}

async function installPackage(name, range, optional) {
  const version = resolveCachedVersion(name, range);
  if (!version) {
    if (optional) {
      missingOptional.push(`${name}@${range}`);
      return;
    }

    throw new Error(`Missing cached package for ${name}@${range}`);
  }

  const id = `${name}@${version}`;
  if (installed.has(id)) {
    return;
  }
  installed.add(id);

  const dest = packageDestination(name);
  const packageJsonPath = path.join(dest, "package.json");

  try {
    const existing = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
    if (existing.version === version) {
      await linkPackageBins(name, existing, dest);
      await installDependencies(existing);
      return;
    }
  } catch {
    // No existing package at the selected destination.
  }

  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });

  const key = cacheIndex.get(name).get(version);
  const cached = await cacache.get(cacheDir, key);
  const archivePath = path.join(os.tmpdir(), `${safeFileName(name)}-${version}.tgz`);
  await fs.writeFile(archivePath, cached.data);
  await tar.x({ file: archivePath, cwd: dest, strip: 1 });

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  await linkPackageBins(name, packageJson, dest);
  await installDependencies(packageJson);
}

async function installDependencies(packageJson) {
  for (const [depName, depRange] of Object.entries(packageJson.dependencies ?? {})) {
    await installPackage(depName, depRange, false);
  }

  for (const [depName, depRange] of Object.entries(packageJson.optionalDependencies ?? {})) {
    await installPackage(depName, depRange, true);
  }
}

async function linkPackageBins(name, packageJson, packageDir) {
  if (!packageJson.bin) {
    return;
  }

  const binDir = path.join(nodeModules, ".bin");
  await fs.mkdir(binDir, { recursive: true });

  const bins = typeof packageJson.bin === "string" ? { [name.split("/").at(-1)]: packageJson.bin } : packageJson.bin;

  for (const [binName, relativeTarget] of Object.entries(bins)) {
    const linkPath = path.join(binDir, binName);
    const targetPath = path.relative(binDir, path.join(packageDir, relativeTarget));
    await fs.rm(linkPath, { force: true });
    await fs.symlink(targetPath, linkPath);
  }
}


function resolveCachedVersion(name, range) {
  const versions = cacheIndex.get(name);
  if (!versions) {
    return null;
  }

  const available = [...versions.keys()].filter((version) => semver.valid(version));

  if (semver.valid(range) && versions.has(range)) {
    return range;
  }

  if (range.startsWith("npm:")) {
    const alias = range.slice(4);
    const aliasVersion = alias.slice(alias.lastIndexOf("@") + 1);
    return versions.has(aliasVersion) ? aliasVersion : semver.maxSatisfying(available, aliasVersion);
  }

  return semver.maxSatisfying(available, range);
}

function packageDestination(name) {
  if (name.startsWith("@")) {
    const [scope, packageName] = name.split("/");
    return path.join(nodeModules, scope, packageName);
  }

  return path.join(nodeModules, name);
}

function parseTarballKey(key) {
  const prefix = "make-fetch-happen:request-cache:";
  if (!key.startsWith(prefix) || !key.endsWith(".tgz")) {
    return null;
  }

  const url = new URL(key.slice(prefix.length));
  if (url.hostname !== "registry.npmjs.org") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
  const file = parts.at(-1);
  const match = file?.match(/-(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\.tgz$/);

  if (!match) {
    return null;
  }

  return {
    name,
    version: match[1],
  };
}

function safeFileName(name) {
  return name.replace(/[@/]/g, "_");
}
