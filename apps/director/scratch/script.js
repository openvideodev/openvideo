const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir("./src", (filePath) => {
  if (filePath.endsWith(".ts")) {
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;

    // Remove DrizzleService import
    if (content.includes("DrizzleService")) {
      content = content.replace(
        /import\s+\{([^}]*?)DrizzleService([^}]*?)\}\s+from\s+['"].*?db.*?['"];?\n?/g,
        (match, p1, p2) => {
          const remaining = [p1, p2]
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ");
          if (remaining) return `import { ${remaining} } from '@openvideo/db';\n`;
          return "";
        },
      );

      // Replace constructor injection
      content = content.replace(/private\s+(readonly\s+)?db:\s*DrizzleService,?/g, "");
      content = content.replace(/constructor\(\s*\)\s*\{\s*\}/g, "");

      // Replace this.db.client with db
      content = content.replace(/this\.db\.client/g, "db");

      // Add db import if needed
      if (content.includes("db.") && !content.includes("getDB")) {
        content = `import { getDB } from '@openvideo/db';\nconst db = getDB();\n\n` + content;
      }
      changed = true;
    }

    // Replace db/schema imports
    if (content.match(/from\s+['"].*?db\/schema['"]/)) {
      content = content.replace(/from\s+['"].*?db\/schema['"]/g, "from '@openvideo/db'");
      changed = true;
    }

    // Replace db.module imports
    if (content.match(/from\s+['"].*?db\/db\.module['"]/)) {
      content = content.replace(
        /import\s+\{.*?DbModule.*?\}\s+from\s+['"].*?db\/db\.module['"];?\n?/g,
        "",
      );
      content = content.replace(/DbModule,?\s*/g, "");
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log("Updated", filePath);
    }
  }
});
