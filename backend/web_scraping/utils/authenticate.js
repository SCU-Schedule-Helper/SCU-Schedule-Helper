import readline from 'readline';

const LOGIN_PAGE = "https://www.myworkday.com/wday/authgwy/scu/login.htmld";

export async function workdayLogin(page) {
    await page.goto(LOGIN_PAGE);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("\n==================================");
    console.log("ACTION REQUIRED IN BROWSER:");
    console.log("Please log in manually inside the Chromium browser that just popped up.");
    console.log("(Go through any Duo or Okta steps if necessary).");
    console.log("==================================\n");

    await new Promise(resolve => {
        rl.question("Press the [Return] / [Enter] key HERE in the terminal once you are fully logged in and see the Workday Dashboard... ", () => {
            rl.close();
            resolve();
        });
    });
    
    console.log("Resuming script...");
}


/*

This was an attempt at automating the login process

// const LOGIN_PAGE = "https://www.myworkday.com/wday/authgwy/scu/login.htmld?redirect=n";
const LOGIN_PAGE = "https://www.myworkday.com/wday/authgwy/scu/login.htmld"
export async function workdayLogin(page, username, password) {
    await page.goto(LOGIN_PAGE);
    await page.waitForNetworkIdle();

    // Check for username field
    const usernameSelector = 'input[aria-label="Username"]';
    if (await page.$(usernameSelector)) {
        await page.locator(usernameSelector).fill(username);
    } else { console.log(`Could not find username input: ${usernameSelector}`); }

    // Check for password field
    const passwordSelector = 'input[aria-label="Password"]';
    if (await page.$(passwordSelector)) {
        await page.locator(passwordSelector).fill(password);
    } else {
        console.log(`Could not find password input: ${passwordSelector}`);
    }

    // Check for login button
    const buttonSelector = 'button[data-automation-id="goButton"]';
    if (await page.$(buttonSelector)) {
        await page.click(buttonSelector);
    } else {
        console.log(`Could not find login button: ${buttonSelector}`);
    }

    // Skip the "Remember this device" page if it appears.
    await page.waitForSelector('[data-automation-id="linkButton"]');
    const skipButton = await page.$('[data-automation-id="linkButton"]');
    await skipButton.click();
    await page.waitForNavigation({
        waitUntil: "load",
    });
}
*/
