import { fetchWithAuth } from "./authorization.js";
import {
  PROD_EVALS_ENDPOINT,
  PROD_NAME_MAPPINGS_ENDPOINT,
} from "./constants.js";

/**
 * Fetches the evals object from the server, then decodes, decompresses, and stores it in local storage.
 * @returns {Promise<void>}
 */
export async function downloadEvals() {
  const evalsLastModifiedDate = (
    await chrome.storage.local.get("evalsLastModifiedDate")
  ).evalsLastModifiedDate;
  const evalsResponse = await fetchWithAuth(PROD_EVALS_ENDPOINT, {
    headers: evalsLastModifiedDate
      ? {
          "If-Modified-Since": evalsLastModifiedDate,
        }
      : {},
  });
  if (!evalsResponse || !evalsResponse.ok || evalsResponse.status === 304) {
    await chrome.storage.local.set({
      isDownloadingEvals: false,
    });
    return;
  }
  const evalsObject = await evalsResponse.json();
  const evals = await decodeAndDecompress(evalsObject.data);
  await chrome.storage.local.set({
    evals,
    evalsLastModifiedDate: evalsResponse.headers.get("last-modified"),
    isDownloadingEvals: false,
  });
}

export async function downloadProfessorNameMappings() {
  let mappingsLastModifiedDate = (
    await chrome.storage.local.get("mappingsLastModifiedDate")
  ).mappingsLastModifiedDate;
  const response = await fetchWithAuth(PROD_NAME_MAPPINGS_ENDPOINT, {
    headers: mappingsLastModifiedDate
      ? {
          "If-Modified-Since": mappingsLastModifiedDate,
        }
      : {},
  });
  if (!response || !response.ok || response.status === 304) {
    return;
  }
  const mappingsResponse = await response.json();
  await chrome.storage.local.set({
    professorNameMappings: mappingsResponse.data,
    mappingsLastModifiedDate: response.headers.get("last-modified"),
  });
}

async function decodeAndDecompress(base64EncodedGzippedData) {
  const binaryString = atob(base64EncodedGzippedData);
  const binaryData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }

  const decompressedStream = new Response(binaryData).body.pipeThrough(
    new DecompressionStream("gzip")
  );
  const decompressedText = await new Response(decompressedStream).text();
  const jsonData = JSON.parse(decompressedText);
  return jsonData;
}
