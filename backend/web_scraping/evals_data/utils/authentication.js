import puppeteer from "puppeteer";

const MAX_LOGIN_TRIES = 5;

const maybeClick = async (page, selector, timeout = 3000) => {
  try {
    const el = await page.waitForSelector(selector, { timeout });
    
    if (el) {
      await el.click();
      console.log(`Successfully clicked element ${selector}.`);
      return true;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.log(`Selector not found within ${timeout}ms (skipping).`);
    } else {
      console.log("An unexpected error occurred:", err.message);
    }
    return false;
  }
};

export async function authenticate(username, password) {
  const loginButton = "button.login_btn > span";
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--incognito"],
  });
  const page = await browser.newPage();

  console.log("Starting authentication...");
  await page.goto("https://www.scu.edu/apps/evaluations");
  await page.waitForNetworkIdle();

  // Fill username and password.
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);

  console.log(`Attemping to login user ${username}`);
  await page.tap(loginButton);
  await page.waitForNetworkIdle();

  let loginTries = 0;
  let needMobileApproval = page.url().includes("duosecurity");
  while (needMobileApproval && loginTries < MAX_LOGIN_TRIES) {
    loginTries++;
    console.log(
      "***************************ACTION REQUIRED***************************",
    );
    console.log(
      "Mobile request sent for authentication. Please approve on your phone.",
    );

    // Log PIN if Duo is showing one
    const duoText = await page.evaluate(() => document.body.innerText);
    const pinMatch = duoText.match(/Enter code in Duo Mobile[\s\S]*?\n(\d{4,6})\n/);
    if (pinMatch) {
      console.log(`PIN CODE: ${pinMatch[1]}`);
    }

    // Wait for the user to approve on their phone
    await maybeClick(page, "button::-p-text(Skip for now)", 30000 );
    const buttonToTap = await page.waitForSelector(
      "button::-p-text(Yes, this is my device), button::-p-text(Try again)",
      { timeout: 5000 },
    ).catch(() => null);

    if (!buttonToTap) continue;

    const buttonText = await buttonToTap.evaluate(node => node.textContent.trim());

    // Checks if duo was done correctly
    needMobileApproval = buttonText === "Try again";
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

  await page.waitForNetworkIdle();
  console.log("Successfully retrieved auth cookies: ");
  const cookies = await page.cookies();
  const SimpleSAML = cookies.find(
    (cookie) => cookie.name === "SimpleSAML",
  ).value;
  const SimpleSAMLAuthToken = cookies.find(
    (cookie) => cookie.name === "SimpleSAMLAuthToken",
  ).value;
  console.log(`SimpleSAML=${SimpleSAML};`);
  console.log(`SimpleSAMLAuthToken=${SimpleSAMLAuthToken};`);

  await browser.close();
  process.env.SIMPLE_SAML = SimpleSAML;
  process.env.SIMPLE_SAML_AUTH_TOKEN = SimpleSAMLAuthToken;
}

export function getWithCookies(url) {
  return fetch(url, {
    method: "GET",
    headers: {
      Cookie: `SimpleSAML=${process.env.SIMPLE_SAML}; SimpleSAMLAuthToken=${process.env.SIMPLE_SAML_AUTH_TOKEN}`,
    },
  });
}
