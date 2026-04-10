import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryVersionPath = path.resolve(__dirname, "..", "..", "version.txt");
const releaseVersion =
  process.env.VITE_TASKBANDIT_RELEASE_VERSION?.trim() ||
  fs.readFileSync(repositoryVersionPath, "utf8").trim() ||
  "0.0.0-dev";
const buildNumber = process.env.VITE_TASKBANDIT_BUILD_NUMBER?.trim() || "local";
const commitSha = process.env.VITE_TASKBANDIT_COMMIT_SHA?.trim() || "local";
const entryPoints = {
  index: path.resolve(__dirname, "index.html"),
  admin: path.resolve(__dirname, "admin.html"),
  client: path.resolve(__dirname, "client.html")
};

export default defineConfig(({ mode }) => {
  const buildInput =
    mode === "admin"
      ? { admin: entryPoints.admin }
      : mode === "client"
        ? { client: entryPoints.client }
        : entryPoints;
  const outDir = mode === "admin" ? "dist-admin" : mode === "client" ? "dist-client" : "dist";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_TASKBANDIT_RELEASE_VERSION": JSON.stringify(releaseVersion),
      "import.meta.env.VITE_TASKBANDIT_BUILD_NUMBER": JSON.stringify(buildNumber),
      "import.meta.env.VITE_TASKBANDIT_COMMIT_SHA": JSON.stringify(commitSha)
    },
    base: "./",
    server: {
      port: 5173
    },
    build: {
      outDir,
      rollupOptions: {
        input: buildInput
      }
    }
  };
});
