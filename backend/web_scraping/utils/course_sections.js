const FIND_COURSE_SECTIONS_URL =
  "https://www.myworkday.com/scu/d/task/1422$3915.htmld";
export async function goToCourseSectionsPage(page, academicPeriod) {
        await page.goto(FIND_COURSE_SECTIONS_URL);
        await page.waitForNetworkIdle();

        // Wait for the academic period search box to appear.
        await page.waitForSelector("input[placeholder='Search']");
        const searchBox = await page.$$("input[placeholder='Search']");
        await searchBox[0].click();
        await page.waitForSelector('[data-automation-label="Future Periods"]');
        // Select the newest academic period.
        const now = new Date();
        let period = "";
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        if (month >= 9 && month <= 11) {
            period = `Fall ${year} Quarter`;
        } else if (month >= 12 || month <= 2) {
            period = `Winter ${month === 12 ? year + 1 : year} Quarter`;
        } else if (month >= 3 && month <= 5) {
            period = `Spring ${year} Quarter`;
        } else if (month >= 6 && month <= 8) {
            period = `Summer ${year} Quarter`;
        }
        academicPeriod = period;
        console.log(`Searching for academic period: ${academicPeriod}`);
        await searchBox[0].type(academicPeriod);
        await searchBox[0].press("Enter");
        await page.waitForSelector('input[type="checkbox"]');
        const checkbox = await page.$('input[type="checkbox"]');
        if(!checkbox) {
            console.error("Checkbox not found. Exiting.");
            return;
        }
        await checkbox.click();
        await page.waitForSelector('[data-automation-id="selectedItem"]');
        
        // Click out of the search box to close it.
        const header = await page.$('[data-automation-id="pageHeader"]');
        if(!header) {
            console.error("Header not found. Exiting.");
            return;
        }
        await header.click();
        
        // Click on the academic level search box.
        await searchBox[1].click();
        await page.waitForSelector('input[type="checkbox"]');
        
        // Press down arrow four times to select undergraduate courses.
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        
        // Proceed to the next page.
        const okButton = await page.$('button[title="OK"]');
        await okButton.click();
}