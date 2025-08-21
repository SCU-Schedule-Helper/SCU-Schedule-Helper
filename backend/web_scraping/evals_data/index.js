import getAndProcessNewEvals from "./utils/get_eval_links.js";
import generateAggregateEvalsFile from "./utils/generate_aggregate_evals_json.js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { login } from "../utils/authenticate.js";
import puppeteer from "puppeteer";
import zlib from "zlib";
import fs from "fs";
import path from "path";

export const EVALUATIONS_URL = "https://www.scu.edu/apps/evaluations/";
export const REQUEST_INTERVAL_MS = 50;
export const REQUEST_MAX_RETRIES = 1;

export let evalsAndTerms = {
  terms: [],
  termIdsToTermNames: {},
  evals: [],
};
export let aggregateEvals = {};

export let existingTerms = new Set();
export let existingEvaluations = new Set();

const PERSISTENT_DATA_PATH = "./persistent_data";
const EVALS_AND_TERMS_FILENAME = "evals_and_terms.json";
const AGGREGATE_EVALS_FILENAME = "aggregate_evals.json";

const s3 =
  process.env.GITHUB_WORKFLOW !== undefined
    ? new S3Client({
        region: process.env.AWS_DEFAULT_REGION,
      })
    : null;

export default async function main() {
  await initDirectoriesAndFiles();
  
  // Create browser and page for login
  const browser = await puppeteer.launch({ args: ["--incognito"] });
  const page = await browser.newPage();
  
  try {
    await login(page, process.env.SCU_USERNAME, process.env.SCU_PASSWORD);
    
    // Get auth cookies after successful login
    const cookies = await page.cookies();
    const SimpleSAML = cookies.find(
      (cookie) => cookie.name === "SimpleSAML",
    )?.value;
    const SimpleSAMLAuthToken = cookies.find(
      (cookie) => cookie.name === "SimpleSAMLAuthToken",
    )?.value;
    
    if (SimpleSAML && SimpleSAMLAuthToken) {
      console.log("Successfully retrieved auth cookies");
      process.env.SIMPLE_SAML = SimpleSAML;
      process.env.SIMPLE_SAML_AUTH_TOKEN = SimpleSAMLAuthToken;
    } else {
      throw new Error("Failed to retrieve authentication cookies");
    }
    
    await getAndProcessNewEvals();
    await generateAggregateEvalsFile();
  } finally {
    await browser.close();
  }
}

async function initDirectoriesAndFiles() {
  // Running locally. Check if the files exist, and if not, create them.
  if (process.env.GITHUB_WORKFLOW === undefined) {
    if (!fs.existsSync(PERSISTENT_DATA_PATH)) {
      fs.mkdirSync(PERSISTENT_DATA_PATH);
    }
    if (
      !fs.existsSync(
        path.resolve(`${PERSISTENT_DATA_PATH}/${EVALS_AND_TERMS_FILENAME}`),
      )
    ) {
      fs.writeFileSync(
        path.resolve(`${PERSISTENT_DATA_PATH}/${EVALS_AND_TERMS_FILENAME}`),
        JSON.stringify(evalsAndTerms),
      );
    } else {
      evalsAndTerms = JSON.parse(
        fs.readFileSync(
          path.resolve(`${PERSISTENT_DATA_PATH}/${EVALS_AND_TERMS_FILENAME}`),
        ),
      );
    }
    if (!fs.existsSync(`${PERSISTENT_DATA_PATH}/${AGGREGATE_EVALS_FILENAME}`)) {
      fs.writeFileSync(
        `${PERSISTENT_DATA_PATH}/${AGGREGATE_EVALS_FILENAME}`,
        "",
      );
    }
  }
  // Running in a GitHub workflow. Retrieve from AWS. The objects should always exist.
  else {
    const command = new GetObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.EVALS_AND_TERMS_JSON_GZ_OBJECT_KEY,
    });
    const evalsAndTermsObject = await s3.send(command);
    let evalsAndTermsBuffer = zlib.gunzipSync(
      Buffer.from(await evalsAndTermsObject.Body.transformToByteArray()),
    );
    evalsAndTerms = JSON.parse(evalsAndTermsBuffer.toString());
  }
  existingTerms = new Set(evalsAndTerms.terms);
  for (const evaluation of evalsAndTerms.evals) {
    const nameWithoutExtension = evaluation.name.split(".pdf")[0];
    existingEvaluations.add(nameWithoutExtension);
    existingEvaluations.add(nameWithoutExtension.split("&viewEval")[0]);
  }
}

export async function writeEvalsAndTerms() {
  if (process.env.GITHUB_WORKFLOW === undefined) {
    fs.writeFileSync(
      path.resolve(`${PERSISTENT_DATA_PATH}/${EVALS_AND_TERMS_FILENAME}`),
      JSON.stringify(evalsAndTerms),
    );
  } else {
    // Upload to AWS.
    const command = new PutObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.EVALS_AND_TERMS_JSON_GZ_OBJECT_KEY,
      Body: zlib.gzipSync(JSON.stringify(evalsAndTerms)),
    });
    const response = await s3.send(command);
    if (
      response.$metadata.httpStatusCode < 200 ||
      response.$metadata.httpStatusCode >= 300
    ) {
      console.error(
        `Failed to upload evals and terms to AWS: ${JSON.stringify(response)}`,
      );
    } else {
      console.log("Successfully uploaded evals and terms to AWS.");
    }
  }
}

export async function writeAggregateEvals() {
  if (process.env.GITHUB_WORKFLOW === undefined) {
    fs.writeFileSync(
      path.resolve(`${PERSISTENT_DATA_PATH}/${AGGREGATE_EVALS_FILENAME}`),
      JSON.stringify(aggregateEvals),
    );
  } else {
    // Upload to AWS.
    const command = new PutObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.AGGREGATE_EVALS_JSON_GZ_OBJECT_KEY,
      Body: zlib.gzipSync(JSON.stringify(aggregateEvals)),
    });
    const response = await s3.send(command);
    if (
      response.$metadata.httpStatusCode < 200 ||
      response.$metadata.httpStatusCode >= 300
    ) {
      console.error(
        `Failed to upload aggregate evals to AWS: ${JSON.stringify(response)}`,
      );
    } else {
      console.log("Successfully uploaded aggregate evals to AWS.");
    }
  }
}

main();
