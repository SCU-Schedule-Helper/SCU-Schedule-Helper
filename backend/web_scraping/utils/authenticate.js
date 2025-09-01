import { ImapFlow } from 'imapflow';

const LOGIN_PAGE = "https://www.myworkday.com/wday/authgwy/scu/login.htmld";

async function getLatestDuoCode() {
    console.log("Getting Duo code");
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: process.env.GMAIL_USERNAME,
            pass: process.env.GMAIL_PASSWORD
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 3000,
        logger: false
    });

    try {
        console.log('Connecting to Gmail via IMAP...');
        await client.connect();
        
        // Select INBOX
        let mailbox = await client.mailboxOpen('INBOX');
        
        // Search for emails from the past 2 days
        const searchDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const searchDateStr = searchDate.toLocaleDateString('en-CA');

        console.log(`Searching for emails from sms2email@voixware.com since ${searchDateStr}...`);

        // Search without UID first to get sequence numbers
        // Search for emails from sms2email@voixware.com (IMAP doesn't support regex)
        const messages = await client.search({
            from: 'sms2email@voixware.com',
            since: searchDateStr
        });
        
        if (messages.length === 0) {
            console.log('No recent SMS emails found');
            await client.logout();
            return null;
        }
        
        console.log(`Found ${messages.length} recent SMS email(s)`);
        console.log("Message sequence numbers:", messages);
        
        // Get the highest sequence number (most recent)
        const latestSeqNum = Math.max(...messages);
        
        // Fetch the latest message
        const latestMessage = await client.fetchOne(latestSeqNum, {
            source: true,
            envelope: true,
            bodyStructure: true
        });
        
        const bodyText = latestMessage.source.toString();
        const duoCode = extractDuoCode(bodyText);
        
        await client.logout();
        
        if (duoCode) {
            console.log('Found Duo code', duoCode);
        } else {
            console.log('Could not extract Duo code');
            console.log('Email preview:', bodyText.substring(0, 200));
        }
        
        return duoCode;
        
    } catch (error) {
        console.error('Error fetching Duo code via IMAP:', error);
        return null;
    }
}

function extractDuoCode(emailBody) {
    // Look for a colon followed by a 7-digit number
    const pattern = /:\s*(\d{7})\b/;
    const match = emailBody.match(pattern);
    
    return match ? match[1] : null;
}

export async function login(page, username, password) {
    await page.goto(LOGIN_PAGE);
    await page.waitForNetworkIdle();

    // Check for username field
    const usernameSelector = 'input#username';
    if (await page.$(usernameSelector)) {
        await page.locator(usernameSelector).fill(username);
    } else {
        console.log(`Could not find username input: ${usernameSelector}`);
    }

    // Check for password field
    const passwordSelector = 'input#password';
    if (await page.$(passwordSelector)) {
        await page.locator(passwordSelector).fill(password);
    } else {
        console.log(`Could not find password input: ${passwordSelector}`);
    }

    // Check for login button
    const buttonSelector = 'button.login_btn';
    if (await page.$(buttonSelector)) {
        await page.click(buttonSelector);
        console.log("Clicked login button");
    } else {
        console.log(`Could not find login button: ${buttonSelector}`);
    }

    // Click other options button if it exists
    const otherOptionsSelector = await page.waitForSelector('button.other-options-link', { timeout: 5000 }).catch(() => null);
    const buttonClassNames = await page.$$eval('button', btns => btns.map(btn => btn.className.trim()));
    console.log('Button class names:', buttonClassNames);
    if (otherOptionsSelector) {
        await otherOptionsSelector.click();
        console.log("Clicked other options");
    } else {
        console.log("Could not find other options button");
        // Try to dismiss Windows Hello popup first if it appears
        try {
            const windowsHelloCancel = await page.waitForSelector('[data-testid="windows-hello-cancel"], .cancel-button, button[aria-label*="Cancel"], button:has-text("Cancel")', { timeout: 2000 });
            if (windowsHelloCancel) {
                await windowsHelloCancel.click();
                console.log("Dismissed Windows Hello popup");
                // Wait a moment for the page to update
                await page.waitForTimeout(1000);
            }
        } catch (error) {
            console.log("No Windows Hello popup found or already dismissed");
        } finally {
            const otherOptionsSelector = await page.waitForSelector('button.other-options-link', { timeout: 5000 }).catch(() => null);
            const buttonClassNames = await page.$$eval('button', btns => btns.map(btn => btn.className.trim()));
            console.log('Button class names:', buttonClassNames);
            if (otherOptionsSelector) {
                await otherOptionsSelector.click();
                console.log("Clicked other options");
            } else {
                console.log("Could not find other options button again");
            }
        }
    }

    
    // List out available authentication methods
    await page.waitForSelector("ul, ol");

    const listClasses = await page.$$eval("ul, ol", lists =>
    lists.map(list => list.className.trim())
    );

    listClasses.forEach(cls => console.log(cls));

    await page.waitForSelector(".all-auth-methods-list .auth-method-wrapper");

    const items = await page.$$eval(".all-auth-methods-list .auth-method-wrapper", els =>
    els.map(el => {
        const name = el.querySelector(".method-label")?.innerText.trim();
        const testId = el.getAttribute("data-testid");
        return testId ? `${name} (${testId})` : name;
    })
    );

    items.forEach(item => console.log(item));    

    // Click the send text message option or "Duo Push"
    const smsOption = await page.waitForSelector('li[data-testid="test-id-sms"]', { timeout: 5000 }).catch(() => null);
    const duoPushOption = await page.waitForSelector('li[data-testid="test-id-duo-push"]', { timeout: 5000 }).catch(() => null);
    if (smsOption) {
        const link = await smsOption.$('a.auth-method');
        if (link) await link.click();
        console.log("Clicked SMS option");
    } else if (duoPushOption) {
        const link = await duoPushOption.$('a.auth-method');
        if (link) await link.click();
        console.log("Clicked Duo Push option");
    } else {
        console.log("Could not find SMS option with data-testid='test-id-sms'");
    }

    // Wait for Duo code to arrive via SMS->Email
    console.log("Waiting for Duo code...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for SMS to arrive

    // Get code from Gmail via IMAP
    const duoCode = await getLatestDuoCode();
    
    if (duoCode) {
        console.log(`Got Duo code: ${duoCode}`);
        await page.locator('input#passcode-input').fill(duoCode);
        await page.click('[data-testid="verify-button"]');
    } else {
        console.log("Could not get Duo code from Gmail");
        throw new Error("Failed to get Duo code");
    }

    // Wait for the next page to load before pressing "Other people use this computer"
    try {
        await page.waitForSelector('#dont-trust-browser-button', { timeout: 10000 });
        await page.click('#dont-trust-browser-button');
    } catch (error) {
        console.log("Could not find 'Other people use this computer' button");
    }

    // Skip the "Remember this device" page if it appears.
    try{
        await page.waitForSelector('[data-automation-id="linkButton"]');
        const skipButton = await page.$('[data-automation-id="linkButton"]');
        await skipButton.click();
        await page.waitForNavigation({
        waitUntil: "load",
        });
    } catch (error) {
        console.log("Could not find 'Remember this device' button");
    }
    
    
}


