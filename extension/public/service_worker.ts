/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import {
  getCalendarOAuthToken,
  signIn,
  signOut,
  updateSubscriptionAndRefreshUserData,
} from "./utils/authorization.ts";
import { PROD_SERVER_URL } from "./utils/constants.ts";
import {
  downloadEvals,
  downloadProfessorNameMappings,
} from "./utils/evalsAndMappings.ts";
import { handleNotification, subscribe } from "./utils/notifications.ts";
import { getRmpRatings } from "./utils/rmp.ts";
import {
  importCurrentCourses,
  deleteAccount,
  importCourseHistory,
  queryUserByName,
  refreshInterestedSections,
  refreshUserData,
  updateUser,
} from "./utils/user.ts";

chrome.runtime.onInstalled.addListener(async (object: chrome.runtime.InstalledDetails) => {
  let internalUrl = chrome.runtime.getURL("landing_page/index.html");

  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const accessToken = (await chrome.storage.sync.get("accessToken"))
      .accessToken;
    if (accessToken) {
      const subscription = await subscribe();
      downloadEvals();
      downloadProfessorNameMappings();
      const refreshError = await updateSubscriptionAndRefreshUserData(
        JSON.stringify(subscription)
      );
      if (refreshError) {
        await signOut();
        chrome.tabs.create({ url: internalUrl }, function (tab) {});
      }
    } else chrome.tabs.create({ url: internalUrl }, function (tab) {});
  }
});

chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (request.url !== undefined) {
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
  }

  if (request.type === "updateUser") {
    updateUser(request.updateItems, request.allowLocalOnly || false).then(
      (response) => {
        sendResponse(response);
      }
    );
  }

  if (request.type === "getRmpRatings") {
    getRmpRatings(request.profName, false)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        console.error("RMP Rating Query Error:", error);
        sendResponse(null);
      });
  }

  if (request.type === "queryUserByName") {
    queryUserByName(request.name).then((response) => {
      sendResponse(response);
    });
  }

  if (request.type === "submitFeedback") {
    handleFeedbackSubmission(request.data).then((response) => {
      sendResponse(response);
    });
  }

  switch (request) {
    case "signIn":
      signIn().then((response) => {
        sendResponse(response);
      });
      break;
    case "signOut":
      signOut().then((response) => {
        sendResponse(response);
      });
      break;
    case "runCalendarOAuth":
      getCalendarOAuthToken().then((response) => {
        sendResponse(response);
      });
      break;
    case "deleteAccount":
      deleteAccount().then((response) => {
        sendResponse(response);
      });
      break;
    case "downloadEvals":
      downloadEvals().then(() => {
        sendResponse();
      });
      break;
    case "importCurrentCourses":
      importCurrentCourses().then((response) => {
        sendResponse(response);
      });
      break;
    case "importCourseHistory":
      importCourseHistory().then((response) => {
        sendResponse(response);
      });
      break;
    case "runStartupChecks":
      runStartupChecks().then(() => {
        sendResponse();
      });
      break;
    default:
      break;
  }
  return true;
});

self.addEventListener("push", function (event: PushEvent) {
  console.log(
    `Push had this data: "${JSON.stringify(event?.data?.json(), null, 2)}"`
  );
  handleNotification(event?.data?.json());
});

self.addEventListener("activate", async (event: ExtendableEvent) => {
  // Set refresh date to 4 days from now.
  await chrome.storage.local.set({
    refreshSelfDataDate: new Date(
      Date.now() + 4 * 24 * 60 * 60 * 1000
    ).getTime(),
  });
  await subscribe();
});

async function runStartupChecks(): Promise<void> {
  const refreshSelfDataDate = (
    await chrome.storage.local.get("refreshSelfDataDate")
  ).refreshSelfDataDate;
  if (
    refreshSelfDataDate === undefined ||
    new Date() > new Date(refreshSelfDataDate)
  ) {
    await refreshUserData();
    await chrome.storage.local.set({
      refreshSelfDataDate: new Date(
        Date.now() + 4 * 24 * 60 * 60 * 1000
      ).getTime(),
    });
  }
  // Check if the evals need to be redownloaded.
  await downloadEvals();
  await downloadProfessorNameMappings();
  // Check if we need to expire any interestedSections.
  await refreshInterestedSections();
}

async function handleFeedbackSubmission(data: any): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(`${PROD_SERVER_URL}/feedback`, {
      method: "POST",
      body: JSON.stringify({ ...data }),
    });
    const responseData = await response.json();
    return {
      ok: response.ok,
      message: responseData.message,
    };
  } catch (error) {
    console.error("Error in handleFeedbackSubmission:", error);
    return {
      ok: false,
      message: "An unknown error occurred. Please try again later.",
    };
  }
}
