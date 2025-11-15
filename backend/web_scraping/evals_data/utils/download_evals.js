import { authenticate, getWithCookies } from "./authentication.js";
import { extractEvalDataFromPdf } from "./parse_eval_pdf.js";
import {
  EVALUATIONS_URL,
  REQUEST_INTERVAL_MS,
  REQUEST_MAX_RETRIES,
  existingEvaluations,
} from "../index.js";
import jsdom from "jsdom";

export async function processEvalLinks(evalLinks, term) {
  for (const link of evalLinks) {
    let evalName = link.split("/?").pop();
    if (!link.trim() || existingEvaluations.has(evalName)) continue;
    await downloadEvalPdfAndExtractData(evalName, term, link.trim(), evalLinks);
  }
}

// Links are needed to add the individual evals if it is a multiple evaluations page.
async function downloadEvalPdfAndExtractData(
  evalName,
  term,
  link,
  links,
  retryAttempts = REQUEST_MAX_RETRIES,
) {
  await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
  if (retryAttempts < 0) {
    console.error(
      `Couldn't download eval pdf ${link} after multiple attempts.`,
    );
    return null;
  }
  let response;
  try {
    response = await getWithCookies(link);
  } catch (e) {
    console.error(`Error fetching eval pdf ${link}: ${e}`);
    return null;
  }
  const responseText = await response.clone().text();

  if (isMultipleEvaluationsPage(responseText, links)) return;
  if (isNoEvaluationsPage(responseText)) {
    console.log(`No evaluations found at ${link}, skipping.`);
    return;
  };
  if (isBadResponse(response, responseText, link)) {
    await authenticate(process.env.SCU_USERNAME, process.env.SCU_PASSWORD);
    await downloadEvalPdfAndExtractData(
      evalName,
      term,
      link,
      links,
      retryAttempts - 1,
    );
  } else {
    await extractEvalDataFromPdf(
      Buffer.from(await response.arrayBuffer()),
      evalName,
      term,
    );
  }
}

function isBadResponse(response, responseText, link) {
  if (!response || !response.headers) {
    console.log(
      `No response or response headers for eval pdf ${link}. Retrying...`,
    );
    return true;
  } else if (
    !response.headers.get("content-type").includes("application/pdf")
  ) {
    console.log(
      `Bad content type ${response.headers.get(
        "content-type",
      )} when downloading eval at ${link}, reauthenticating...`,
    );
    return true;
  } else if (responseText.includes("SCU Login")) {
    console.error(
      `Bad auth when downloading eval at ${link}. Reauthenticating...`,
    );
  }
  return false;
}

function isMultipleEvaluationsPage(responseText, evalLinks) {
  if (
    !responseText.includes("Multiple evaluations were found for this course.")
  )
    return false;
  const doc = new jsdom.JSDOM(responseText).window.document;
  let newLinks = [];
  doc.querySelectorAll("a").forEach((link) => {
    if (link.textContent.includes(".pdf"))
      newLinks.push(EVALUATIONS_URL + link.href);
  });
  newLinks.forEach(evalLinks.add, evalLinks);
  return true;
}

function isNoEvaluationsPage(responseText) {
  return responseText.includes("We're sorry, no evaluations were found for this course.");
}