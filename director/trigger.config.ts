import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_pqlnjsuvdvmflxdvvlia",
  dirs: ["./trigger"],
  maxDuration: 900, // 15 min — enough for large video indexing
  build: {
    extensions: [ffmpeg()],
  },
});
