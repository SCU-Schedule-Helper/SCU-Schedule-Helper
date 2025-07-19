import puppeteer from "puppeteer";
import { workdayLogin } from '../utils/authenticate.js';
import { goToCourseSectionsPage } from '../utils/course_sections.js';
import path from "path";

const extensionPath = path.resolve('../../../extension/out')
// Need headfull browser for chrome extension to work
export const browser = await puppeteer.launch({
  headless: false,
  devtools: true,
  slowMo: 50,
  args: [ 
    "--start-maximized",
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ],
});

let page = await browser.newPage(); 

async function main() {
    closeChromeExtensionPopUp();
    await workdayLogin(page, "07700000853", "Mercer.603716");
    await checkRaitingInjections();
    await checkCalanderButton();
}

main();

async function checkRaitingInjections() {
  // Check to see if the raiting show up on the course sections page
  await goToCourseSectionsPage(page, "Fall 2025");
  await page.waitForSelector('#SCU-Schedule-Helper-Score-Container', { timeout: 10000 });
  const raitingsExist = await page.$('#SCU-Schedule-Helper-Score-Container');
  if (!raitingsExist) {
    console.log('The Course Ratings are not injected correctly.');
  } else {
    console.log('The Course Ratings are injected correctly.');
  }
}

async function checkCalanderButton() {
  // Check to see if the calander button shows up on view my courses page
  await page.goto("https://www.myworkday.com/scu/d/task/2998$28771.htmld");
  await page.waitForNetworkIdle();
  await page.waitForSelector('#SCU-Schedule-Helper-Google-Calendar-Button', { timeout: 10000 });
  const raitingsExist = await page.$('#SCU-Schedule-Helper-Google-Calendar-Button');
  if (!raitingsExist) {
    console.log('The Google Calendar button is not injected correctly.');
  } else {
    console.log('The Google Calendar button is injected correctly.');
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