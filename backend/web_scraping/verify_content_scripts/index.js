import puppeteer from "puppeteer";
import { workdayLogin } from '../utils/authenticate.js';
import { goToCourseSectionsPage } from '../utils/course_sections.js';

// Need headfull browser for chrome extension to work
export const browser = await puppeteer.launch({
  headless: false,
  devtools: true,
  slowMo: 50,
  args: [ "--start-maximized" ],
});
const page = await browser.newPage(); 

async function main() {
    await workdayLogin(page, "07700000853", "Mercer.603716");
    await checkRaitingInjections();
}

main();

async function checkRaitingInjections() {
  // This function will check if the course ratings are injected correctly.
  await goToCourseSectionsPage(page, "Fall 2025");

}