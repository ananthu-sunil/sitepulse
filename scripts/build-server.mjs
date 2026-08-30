import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const stagingDir = path.join(root, ".tmp", "server-build");

const stagingServerSrc = path.join(
  stagingDir,
  "server",
  "src",
);

const stagingBackend = path.join(
  stagingDir,
  "backend",
);

const serverSrc = path.join(root, "server", "src");
const backendSrc = path.join(root, "backend");
const serverDist = path.join(root, "server", "dist");

await rm(stagingDir, {
  recursive: true,
  force: true,
});

await rm(serverDist, {
  recursive: true,
  force: true,
});

await mkdir(stagingServerSrc, {
  recursive: true,
});

await mkdir(stagingBackend, {
  recursive: true,
});

await cp(serverSrc, stagingServerSrc, {
  recursive: true,
});

await cp(
  path.join(backendSrc, "config"),
  path.join(stagingBackend, "config"),
  {
    recursive: true,
  },
);

await cp(
  path.join(backendSrc, "db"),
  path.join(stagingBackend, "db"),
  {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  },
);

await cp(
  path.join(backendSrc, "scanner"),
  path.join(stagingBackend, "scanner"),
  {
    recursive: true,
    filter: (source) => !source.endsWith(".test.ts"),
  },
);

const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",

    rootDir: ".",
    outDir: "dist",

    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,

    sourceMap: true,
    noEmitOnError: true,
  },

  include: [
    "server/src/**/*.ts",
    "backend/**/*.ts",
  ],

  exclude: [
    "**/*.test.ts",
    "node_modules",
    "dist",
  ],
};

await writeFile(
  path.join(stagingDir, "tsconfig.json"),
  JSON.stringify(tsconfig, null, 2),
);

await execFileAsync(
  process.execPath,
  [
    path.join(
      root,
      "node_modules",
      "typescript",
      "bin",
      "tsc",
    ),
    "-p",
    "tsconfig.json",
  ],
  {
    cwd: stagingDir,
  },
);

const compiledServerSrc = path.join(
  stagingDir,
  "dist",
  "server",
  "src",
);

const compiledBackend = path.join(
  stagingDir,
  "dist",
  "backend",
);

await mkdir(serverDist, {
  recursive: true,
});

await cp(
  compiledServerSrc,
  path.join(serverDist, "server", "src"),
  {
    recursive: true,
  },
);

await cp(
  compiledBackend,
  path.join(serverDist, "backend"),
  {
    recursive: true,
  },
);

await cp(
  path.join(backendSrc, "db", "migrations"),
  path.join(
    serverDist,
    "backend",
    "db",
    "migrations",
  ),
  {
    recursive: true,
  },
);

await writeFile(
  path.join(serverDist, "server.js"),
  'import "./server/src/server.js";\n',
);

await rm(
  path.join(root, ".tmp"),
  {
    recursive: true,
    force: true,
  },
);

console.log("Server build completed.");