const LOGIN_PAGE = "https://www.myworkday.com/wday/authgwy/scu/login.htmld?redirect=n";

export async function workdayLogin(page, username, password) {
    await page.goto(LOGIN_PAGE);
    await page.waitForNetworkIdle();

    // Check for username field
    const usernameSelector = 'input[aria-label="Username"]';
    if (await page.$(usernameSelector)) {
        await page.locator(usernameSelector).fill(username);
    } else { console.log(`Could not find username input: ${usernameSelector}`);}

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
