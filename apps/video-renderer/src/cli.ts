#!/usr/bin/env node
/**
 * CLI entry point
 *
 * Usage:
 *   tsx src/cli.ts <project.json> [output.mp4]
 *   node dist/cli.js  <project.json> [output.mp4]
 *
 * If output path is omitted it defaults to "output.<format>" in the current directory.
 */

import fs from "fs/promises";
import path from "path";
import { renderVideo } from "./index.js";

async function main() {
  const [, , projectArg, outputArg] = process.argv;

  if (!projectArg || projectArg === "--help" || projectArg === "-h") {
    console.log(`
Usage:
  tsx src/cli.ts <project.json> [output.mp4]

Arguments:
  project.json   Path to a ProjectJSON file
  output.mp4     Output path (optional, defaults to output.mp4 in cwd)
`);
    process.exit(projectArg ? 0 : 1);
  }

  const projectPath = path.resolve(projectArg);
  const raw = await fs.readFile(projectPath, "utf-8").catch(() => {
    console.error(`❌ Cannot read project file: ${projectPath}`);
    process.exit(1);
  });

  let project: unknown;
  try {
    project = JSON.parse(raw as string);
  } catch {
    console.error("❌ Invalid JSON in project file");
    process.exit(1);
  }

  const format = (project as any)?.settings?.format ?? "mp4";
  const outputPath = outputArg
    ? path.resolve(outputArg)
    : path.join(process.cwd(), `output.${format}`);

  console.log(`🎬 Rendering ${path.basename(projectPath)} → ${outputPath}`);

  let lastLogged = -1;
  const buffer = await renderVideo(project as any, {
    outputPath,
    onProgress: (p) => {
      const pct = Math.floor(p * 100);
      if (pct !== lastLogged && pct % 5 === 0) {
        process.stdout.write(`   ${pct}%\r`);
        lastLogged = pct;
      }
    },
  });

  console.log(`\n✅ Done — ${outputPath} (${(buffer.length / 1_000_000).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error("❌ Render failed:", (err as Error).message);
  process.exit(1);
});
