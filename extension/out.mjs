import { promises as fsPromises } from "fs";
import { existsSync } from "fs"; // For existsSync
import { sync } from "glob";
import { join } from "path";

async function processFiles() {
  try {
    // Check if out directory exists first
    if (!existsSync("out")) {
      console.error('Error: "out" directory does not exist');
      return;
    }

    const sourcePath = join("out", "_next");
    const destinationPath = join("out", "next");

    // Find all HTML files
    const files = sync("out/**/*.html");

    // Process each HTML file
    for (const file of files) {
      const content = await fsPromises.readFile(file, "utf-8");
      const modifiedContent = content.replace(/\/_next/g, "./next");
      await fsPromises.writeFile(file, modifiedContent, "utf-8");
    }

    // Check if source directory exists
    if (!existsSync(sourcePath)) {
      console.error('Error: "_next" directory does not exist');
      return;
    }

    // If next directory already exists, remove it
    if (existsSync(destinationPath)) {
      await fsPromises.rm(destinationPath, { recursive: true, force: true });
    }

    // Rename _next to next
    await fsPromises.rename(sourcePath, destinationPath);
    // Remove any .ts source files that may have been copied into out
    const tsFiles = sync("out/**/*.ts");
    for (const tsFile of tsFiles) {
      try {
        await fsPromises.rm(tsFile, { force: true });
      } catch (e) {
        console.warn("Failed to remove TS file:", tsFile, e);
      }
    }

    console.log("Successfully processed files and renamed _next to next");

  } catch (error) {
    console.error("Error during processing:", error);
    process.exit(1); // Exit with error code
  }
}

// Run the function
processFiles();
