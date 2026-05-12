import puppeteer from "puppeteer";

const MAX_LOGIN_TRIES = 5;

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

    await maybeClick(page, ".other-options-link");
    await maybeClick(page, "::-p-text(Duo Push)");

    // If there is a verification code, log it.
    try {
      await page.waitForSelector(".verification-code", { timeout: 2000 });
    } catch (ignore) {}
    const verificationCodeDiv = await page.$(".verification-code");
    if (verificationCodeDiv) {
      const verificationCode = await verificationCodeDiv.evaluate(
        (node) => node.textContent,
      );
      console.log(`Use verification code: ${verificationCode}`);
    }

    // Skip for now — optional
    await maybeClick(page, '::-p-text(Skip for now)');

    // Wait for the Yes, this is my device button to appear (i.e. the user has approved the push).
    const buttonToTap = await page.waitForSelector(
      "button::-p-text(Yes, this is my device), button::-p-text(Try again)",
      { timeout: 65000 },
    );

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

const maybeClick = async (page, selector, timeout = 3000) => {
  try {
    const el = await page.waitForSelector(selector, { timeout });
    if (el) {
      console.log(`Found and tapping: ${selector}`);
      await el.tap();
      console.log(`Done: ${selector}`);
      return true;
    }
  } catch {
    console.log(`Not found, skipping: ${selector}`);
    return false;
  }
};

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
