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

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_TASKBANDIT_RELEASE_VERSION": JSON.stringify(releaseVersion),
    "import.meta.env.VITE_TASKBANDIT_BUILD_NUMBER": JSON.stringify(buildNumber),
    "import.meta.env.VITE_TASKBANDIT_COMMIT_SHA": JSON.stringify(commitSha)
  },
  base: "./",
  server: {
    port: 5173
  }
});
