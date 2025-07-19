import puppeteer from "puppeteer";
import { workdayLogin } from '../utils/authenticate.js';
import { goToCourseSectionsPage } from '../utils/course_sections.js';
import path from "path";

const extensionPath = path.resolve('../../../extension/out')
// Need headfull browser for chrome extension to work
export const browser = await puppeteer.launch({
  headless: false,
  devtools: true,
  args: [ 
    "--start-maximized",
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ],
});

let page = await browser.newPage(); 

async function main() {
  try {
    closeChromeExtensionPopUp();
    await workdayLogin(page, process.env.WORKDAY_USERNAME, process.env.WORKDAY_PASSWORD);
    await checkRaitingInjections();
    await checkCalanderButton();
    browser.close();
  } catch (error) {
    console.error("Error during testing:", error);
  } finally {
    browser.close();
  }
}

main();

async function checkRaitingInjections() {
  try {
    // Check to see if the rating shows up on the course sections page
    await goToCourseSectionsPage(page);
    await page.waitForSelector('#SCU-Schedule-Helper-Score-Container', { timeout: 5000 });
    const ratingsExist = await page.$('#SCU-Schedule-Helper-Score-Container');
    if (!ratingsExist) {
      console.log('The Course Ratings are not injected correctly.');
    } else {
      console.log('The Course Ratings are injected correctly.');
    }
  } catch (error) {
    console.log('The Course Ratings are not injected correctly.');
  }
}

async function checkCalanderButton() {
  try {
    // Check to see if the calendar button shows up on view my courses page
    await page.goto("https://www.myworkday.com/scu/d/task/2998$23771.htmld");
    await page.waitForNetworkIdle();
    await page.waitForSelector('#SCU-Schedule-Helper-Google-Calendar-Button', { timeout: 5000 });
    const ratingsExist = await page.$('#SCU-Schedule-Helper-Google-Calendar-Button');
    if (!ratingsExist) {
      console.log('The Google Calendar button is not injected correctly.');
    } else {
      console.log('The Google Calendar button is injected correctly.');
    }
  } catch (error) {
    console.log('The Google Calendar button is not injected correctly.');
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