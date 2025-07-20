import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { workdayLogin } from "../utils/authenticate.js";
import { goToCourseSectionsPage } from "../utils/course_sections.js";
import { parseCourseSectionsXlsx } from "./utils/xlsx_to_csv.js";

export const REQUEST_INTERVAL_MS = 50;
export const REQUEST_MAX_RETRIES = 1;
export const browser = await puppeteer.launch({
  args: ["--incognito"],
});
export const page = await browser.newPage();
export let professorNameMappings = {};

const PERSISTENT_DATA_PATH = "./persistent_data";
const PROFESSOR_NAME_MAPPINGS_FILENAME = "professor_name_mappings.json";

const s3 =
  process.env.GITHUB_WORKFLOW !== undefined
    ? new S3Client({
        region: process.env.AWS_DEFAULT_REGION,
      })
    : null;

export default async function main() {
  console.log(
    `Attempting to update professor name mappings with data from the current term`
  );
  try {
    await initDirectoriesAndFiles();
    await workdayLogin(page, process.env.WORKDAY_USERNAME, process.env.WORKDAY_PASSWORD);
    await goToCourseSectionsPage(page);
    await getAndProcessNameMappings();
    await writeMappings();
  } catch (e) {
    console.error("Encountered error:", e);
  } finally {
    browser.close();
  }
}

async function getAndProcessNameMappings() {
  // Download and parse the course sections spreadsheet.
  await page.waitForSelector("[title='Export to Excel']");
  const exportToExcelButton = await page.$('[title="Export to Excel"]');
  await exportToExcelButton.click();
  await page.waitForSelector("button[title='Download']");
  const downloadButton = await page.$('button[title="Download"]');
  const client = await browser.target().createCDPSession();
  const curDirectory = process.cwd();
  await client.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: curDirectory,
    eventsEnabled: true,
  });
  await downloadButton.click();
  await waitForDownload(client);
  parseCourseSectionsXlsx(`${curDirectory}/SCU_Find_Course_Sections.xlsx`);

  // Clean up the downloaded file.
  fs.rmSync(`${curDirectory}/SCU_Find_Course_Sections.xlsx`);
}

async function waitForDownload(session) {
  return new Promise((resolve) => {
    session.on("Browser.downloadProgress", (e) => {
      if (e.state === "completed") {
        console.log("Successfully downloaded course section spreadsheet.");
        resolve();
      }
    });
  });
}
  

async function initDirectoriesAndFiles() {
  // Running locally. Check if the files exist, and if not, create them.
  if (process.env.GITHUB_WORKFLOW === undefined) {
    if (!fs.existsSync(PERSISTENT_DATA_PATH)) {
      fs.mkdirSync(PERSISTENT_DATA_PATH);
    }
    if (
      !fs.existsSync(
        path.resolve(
          `${PERSISTENT_DATA_PATH}/${PROFESSOR_NAME_MAPPINGS_FILENAME}`
        )
      )
    ) {
      fs.writeFileSync(
        path.resolve(
          `${PERSISTENT_DATA_PATH}/${PROFESSOR_NAME_MAPPINGS_FILENAME}`
        ),
        JSON.stringify(professorNameMappings)
      );
    } else {
      professorNameMappings = JSON.parse(
        fs.readFileSync(
          path.resolve(
            `${PERSISTENT_DATA_PATH}/${PROFESSOR_NAME_MAPPINGS_FILENAME}`
          )
        )
      );
    }
  } else {
    // Running in AWS. Download the files from S3.
    const command = new GetObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.PROFESSOR_NAME_MAPPINGS_JSON_OBJECT_KEY,
    });
    const response = await s3.send(command);
    if (
      response.$metadata.httpStatusCode < 200 ||
      response.$metadata.httpStatusCode >= 300
    ) {
      console.error(
        `Failed to download professor name mappings from AWS: ${JSON.stringify(
          response
        )}`
      );
    } else {
      professorNameMappings = JSON.parse(
        await response.Body.transformToString()
      );
    }
  }
}

export async function writeMappings() {
  if (process.env.GITHUB_WORKFLOW === undefined) {
    fs.writeFileSync(
      path.resolve(
        `${PERSISTENT_DATA_PATH}/${PROFESSOR_NAME_MAPPINGS_FILENAME}`
      ),
      JSON.stringify(professorNameMappings)
    );
    console.log("Successfully wrote mappings to file.");
  } else {
    // Upload to AWS.
    const command = new PutObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.PROFESSOR_NAME_MAPPINGS_JSON_OBJECT_KEY,
      Body: JSON.stringify(professorNameMappings),
    });
    const response = await s3.send(command);
    if (
      response.$metadata.httpStatusCode < 200 ||
      response.$metadata.httpStatusCode >= 300
    ) {
      console.error(
        `Failed to upload professor name mappings to AWS: ${JSON.stringify(
          response
        )}`
      );
    } else {
      console.log("Successfully uploaded professor name mappings to AWS.");
    }
  }
}

main();
