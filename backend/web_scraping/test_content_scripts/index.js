import puppeteer from "puppeteer";
import { workdayLogin } from '../utils/authenticate.js';
import { goToCourseSectionsPage } from '../utils/course_sections.js';
import path from "path";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const extensionPath = path.resolve('../../../extension/out')
// Need headfull browser for chrome extension to work
export const browser = await puppeteer.launch({
  slowMo: 15,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

let page = await browser.newPage();
let message = "";

async function main() {
  try {
    closeChromeExtensionPopUp();
    const allPages = await browser.pages();
    if (allPages.length > 1) {
      for (let i = 1; i < allPages.length; i++) {
        await allPages[i].close();
      }
    }
    page = allPages[0];
    await workdayLogin(page, process.env.WORKDAY_USERNAME, process.env.WORKDAY_PASSWORD);
    await checkRatingInjections();
    await checkCalendarButton();
    browser.close();
  } catch (error) {
    console.error("Error during testing:", error);
    message += `- Error during testing: ${error}\n`;
    message += `Stack trace: ${error.stack}\n`;
  } finally {
    browser.close();
  }
  if (message.length > 0) {
    await sendSnsNotification(message);
  }
}

main();

async function checkRatingInjections() {
  try {
    // Check to see if the rating shows up on the course sections page
    await goToCourseSectionsPage(page);
    await page.waitForSelector('.SCU-Schedule-Helper-Score-Container', { timeout: 5000 });
    const ratingsExist = await page.$('.SCU-Schedule-Helper-Score-Container');
    if (!ratingsExist) {
      message += '- The course ratings are not injected correctly.\n';
    } else {
      console.log('The course ratings are injected correctly.');
    }
  } catch (error) {
    console.log('The course ratings are not injected correctly.');
    message += '- The course ratings are not injected correctly.\n';
  }
}

async function checkCalendarButton() {
  try {
    // Check to see if the calendar button shows up on view my courses page
    await page.goto("https://www.myworkday.com/scu/d/task/2998$28771.htmld");
    await page.waitForNetworkIdle();
    await page.waitForSelector('.SCU-Schedule-Helper-Google-Calendar-Button', { timeout: 5000 });
    const ratingsExist = await page.$('.SCU-Schedule-Helper-Google-Calendar-Button');
    if (!ratingsExist) {
      console.log('The Google Calendar button is not injected correctly.');
      message += '- The Google Calendar button is not injected correctly.\n';
    } else {
      console.log('The Google Calendar button is injected correctly.');
    }
  } catch (error) {
    console.log('The Google Calendar button is not injected correctly.');
    message += '- The Google Calendar button is not injected correctly.\n';
  }
}

async function closeChromeExtensionPopUp() {
  // Wait for the extension popup to appear
  let popupFound = false;
  for (let i = 0; i < 20; i++) { // Try for up to ~2 seconds
    const pages = await browser.pages();
    for (const p of pages) {
      const url = await p.url();
      if (url.includes("chrome-extension")) {
        await p.close();
        popupFound = true;
        break;
      }
    }
    if (popupFound) break;
    await new Promise(res => setTimeout(res, 100)); // Wait 100ms before retrying
  }
}

async function sendSnsNotification(snsmessage) {
  const params = {
    Message: `Issues found:\n ${snsmessage}`,
    TopicArn: process.env.SNS_TOPIC_ARN
  };
  await snsClient.send(new PublishCommand(params));
}