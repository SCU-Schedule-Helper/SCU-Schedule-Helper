import { ImapFlow } from 'imapflow';

const LOGIN_PAGE = "https://www.myworkday.com/wday/authgwy/scu/login.htmld";

async function getLatestDuoCode(maxAgeMinutes) {
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
        
        // Search for recent emails from SMS service
        const searchDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
        const searchDateStr = searchDate.toISOString().split('T')[0];
        
        console.log(`Searching for emails from sms2email@voixware.com since ${searchDateStr}...`);
        
        // Search without UID first to get sequence numbers
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
            console.log('Found Duo code');
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
    } else {
        console.log(`Could not find login button: ${buttonSelector}`);
    }

    // Click other options button if it exists
    const otherOptionsSelector = await page.waitForSelector('button.other-options-link', { timeout: 5000 }).catch(() => null);
    if (otherOptionsSelector) {
        await otherOptionsSelector.click();
        console.log("Clicked other options");
    } else {
        console.log("Could not find other options button");
    }

    // Click the send text message option
    const smsOption = await page.waitForSelector('li[data-testid="test-id-sms"]', { timeout: 5000 }).catch(() => null);
    if (smsOption) {
        const link = await smsOption.$('a.auth-method');
        if (link) await link.click();
        console.log("Clicked SMS option");
    } else {
        console.log("Could not find SMS option with data-testid='test-id-sms'");
    }

    // Wait for Duo code to arrive via SMS->Email
    console.log("Waiting for Duo code...");
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds for SMS to arrive

    // Get code from Gmail via IMAP
    const duoCode = await getLatestDuoCode(1);
    
    if (duoCode) {
        console.log(`Got Duo code: ${duoCode}`);
        // TODO: Add logic to enter the Duo code in the page
        // Example: await page.locator('input#duo-code').fill(duoCode);
        // await page.click('button#submit-duo');
    } else {
        console.log("Could not get Duo code from Gmail");
        throw new Error("Failed to get Duo code");
    }
}