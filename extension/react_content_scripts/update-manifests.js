import fs from "fs";
import path from "path";
let __dirname = import.meta.dirname;

function updateManifests() {
  try {
    __dirname = __dirname ?? "";
    const manifestPath = path.join(__dirname, "dist", "manifest.json");
    const manifest = fs.readFileSync(manifestPath, "utf8");
    const updatedManifest = manifest.replace(
      '"use_dynamic_url": true',
      '"use_dynamic_url": false',
    );

    // Located in ../../../out/manifest.json
    const outManifestPath = path.join(
      __dirname,
      "..",
      "out",
      "manifest.json",
    );
    // Merge the content_scripts and web_accessible_resources from the updated manifest.json
    const outManifest = fs.readFileSync(outManifestPath, "utf8");
    const updatedOutManifest = JSON.parse(outManifest);
    const updatedManifestJson = JSON.parse(updatedManifest);
    // Delete any previous content_scripts and web_accessible_resources that contain the assets/ folder
    updatedOutManifest.content_scripts =
      updatedOutManifest.content_scripts.filter(
        (script) => !script.js.some((j) => j.includes("assets/")),
      );
    updatedOutManifest.web_accessible_resources =
      updatedOutManifest.web_accessible_resources.filter(
        (resource) => !resource.resources.some((r) => r.includes("assets/")),
      );
    updatedOutManifest.content_scripts = [
      ...updatedOutManifest.content_scripts,
      ...updatedManifestJson.content_scripts,
    ];
    updatedOutManifest.web_accessible_resources = [
      ...updatedOutManifest.web_accessible_resources,
      ...updatedManifestJson.web_accessible_resources,
    ];

    fs.writeFileSync(manifestPath, updatedManifest, "utf8");
    fs.writeFileSync(
      outManifestPath,
      JSON.stringify(updatedOutManifest, null, 2),
      "utf8",
    );
    // Copy the assets folder from dist to out
    const assetsPath = path.join(__dirname, "dist", "assets");
    const outAssetsPath = path.join(__dirname, "..", "out", "assets");
    fs.rmSync(outAssetsPath, { recursive: true, force: true });
    fs.mkdirSync(outAssetsPath, { recursive: true });
    fs.cpSync(assetsPath, outAssetsPath, { recursive: true });
    console.log("Updated manifests.");
  } catch (error) {
    console.error("Error updating manifests: ", error);
  }
}

updateManifests();
