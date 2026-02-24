export async function workdayLogin(page, username, password) {
    const loginButton = "button.login_btn > span";
    const MAX_LOGIN_TRIES = 5;

    console.log("Starting authentication...");
    await page.goto("https://www.myworkday.com/wday/authgwy/scu/login.htmld");
    await page.waitForNetworkIdle();
    await scuLogin();

    let loginTries = 0;
    let needMobileApproval = page.url().includes("duosecurity");
    // console.log(await page.content());

    while (needMobileApproval && loginTries < MAX_LOGIN_TRIES) {
        loginTries++;
        console.log(
            "***************************ACTION REQUIRED***************************",
        );
        console.log(
            "Mobile request sent for authentication. Please approve on your phone.",
        );
        // Press other options, in case the user isn't using mobile push.
        const otherOptionsButton = await page.waitForSelector(
            ".other-options-link",
        );
        await otherOptionsButton.tap();
        // Wait for the Duo Push button to appear, and tap it.
        const duoPushButton = await page.waitForSelector("::-p-text(Duo Push)");
        await duoPushButton.tap();
        // If there is a verification code, log it.
        try {
            await page.waitForSelector(".verification-code", { timeout: 2000 });
        } catch (ignore) { }

        const verificationCodeDiv = await page.$(".verification-code");
        if (verificationCodeDiv) {
            const verificationCode = await verificationCodeDiv.evaluate(
                (node) => node.textContent,
            );
            console.log(`Use verification code: ${verificationCode}`);
        }

        // Sometimes it asks for scu login again
        if (page.url().includes("login.scu")) {
            await scuLogin();
        }

        // Wait for the Yes, this is my device button to appear (i.e. the user has approved the push).
        const buttonToTap = await page.waitForSelector(
            "button::-p-text(Yes, this is my device), button::-p-text(Try again)",
            { timeout: 65000 },
        );
        console.log("Tapped the yes this is my device button")
        needMobileApproval = await buttonToTap.evaluate(
            (node) => node.textContent === "Try again",
        );
        await buttonToTap.tap();
        if (!needMobileApproval) {
            await page.waitForRequest((request) => request.url().includes("scu.edu"));
        } else {
            console.log("Mobile request not approved. Retrying...");
            await page.waitForSelector("::-p-text(Other options)");
        }
    }

    if (loginTries >= MAX_LOGIN_TRIES) {
        console.log("Failed to login after 5 tries. Exiting.");
        await browser.close();
        throw new Error("Failed to login after 5 tries.");
    }

    async function scuLogin() {
        // Fill username and password.
        await page.waitForSelector("#username");
        await page.locator("#username").fill(username);
        await page.locator("#password").fill(password);

        console.log(`Attemping to login user ${username}`);
        await page.tap(loginButton);
        await page.waitForNetworkIdle();
    }
}