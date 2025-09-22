import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { readFileSync } from "fs";

const CONTACT_LIST_NAME = "SCU-Schedule-Helper-Users";
const TOPIC_NAME = "announcements";
const FROM_EMAIL = '"SCU Schedule Helper" <stevie@mail.scu-schedule-helper.me>';
const TEST_EMAIL = "your-email@example.com";
const REGION = "us-west-1";
const sesv2 = new SESv2Client({ region: REGION });

const emailContent = readFileSync("email.html").toString();

async function sendTestEmail(testEmail) {
  console.log("Sending test email");
  console.log(`From: ${FROM_EMAIL}`);
  console.log(`To: ${testEmail}`);
  console.log(`Using contact list: ${CONTACT_LIST_NAME}\n`);

  if (!isValidEmail(testEmail)) {
    throw new Error(`Invalid email address: ${testEmail}`);
  }

  const emailParams = {
    FromEmailAddress: FROM_EMAIL,
    Destination: {
      ToAddresses: [testEmail],
    },
    Content: {
      Simple: {
        Subject: {
          Data: "Updates to SCU Schedule Helper",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: emailContent,
            Charset: "UTF-8",
          },
        },
      },
    },
    ListManagementOptions: {
      ContactListName: CONTACT_LIST_NAME,
      TopicName: TOPIC_NAME,
    },
  };

  const result = await sesv2.send(new SendEmailCommand(emailParams));
  if (!result.MessageId) {
    throw new Error("No MessageId returned from SES");
  }
  console.log("Test email sent successfully!");
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function main() {
  if (TEST_EMAIL === "your-email@example.com") {
    console.error('Edit line 8 in this script and replace "your-email@example.com"');
    process.exit(1);
  }

  await sendTestEmail(TEST_EMAIL);
}

main();
