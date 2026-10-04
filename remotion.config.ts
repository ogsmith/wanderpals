import path from "node:path";
import { Config } from "@remotion/cli/config";

// Let the video import app components with the same "@/..." alias as Next.js.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: { ...config.resolve, alias: { ...(config.resolve?.alias ?? {}), "@": path.join(process.cwd(), "src") } },
}));
Config.setVideoImageFormat("jpeg");
