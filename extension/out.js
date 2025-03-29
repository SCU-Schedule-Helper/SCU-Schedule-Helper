const fsPromises = require("fs").promises;
const fs = require("fs"); // For existsSync
const glob = require("glob");
const path = require("path");

async function processFiles() {
  try {
    // Check if out directory exists first
    if (!fs.existsSync("out")) {
      console.error('Error: "out" directory does not exist');
      return;
    }

    const sourcePath = path.join("out", "_next");
    const destinationPath = path.join("out", "next");

    // Find all HTML files
    const files = glob.sync("out/**/*.html");

    // Process each HTML file
    for (const file of files) {
      const content = await fsPromises.readFile(file, "utf-8");
      const modifiedContent = content.replace(/\/_next/g, "./next");
      await fsPromises.writeFile(file, modifiedContent, "utf-8");
    }

    // Check if source directory exists
    if (!fs.existsSync(sourcePath)) {
      console.error('Error: "_next" directory does not exist');
      return;
    }

    // If next directory already exists, remove it
    if (fs.existsSync(destinationPath)) {
      await fsPromises.rm(destinationPath, { recursive: true, force: true });
    }

    // Rename _next to next
    await fsPromises.rename(sourcePath, destinationPath);
    console.log("Successfully processed files and renamed _next to next");

  } catch (error) {
    console.error("Error during processing:", error);
    process.exit(1); // Exit with error code
  }
}

// Run the function
processFiles();
