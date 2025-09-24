import { SESv2Client, SendEmailCommand, ListContactsCommand, GetContactCommand } from "@aws-sdk/client-sesv2";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { readFileSync } from "fs";
import https from "https";

const CONTACT_LIST_NAME = "SCU-Schedule-Helper-Users";
const TOPIC_NAME = "announcements";
const FROM_EMAIL = '"SCU Schedule Helper Team" <scuschedulehelper@gmail.com>';
const SUBJECT_LINE = "Updates to SCU Schedule Helper";
const REGION = "us-west-1";
const FETCH_FULL_CONTACT_DETAILS = true;
const ALLOWED_PLACEHOLDERS = ["name"];
const DRY_RUN = process.argv.includes("--dry-run");
const testEmail = process.argv
    .filter(arg => arg.startsWith("--test-email="))
    .map(arg => arg.replace("--test-email=", "").trim());

const agent = new https.Agent({
    maxSockets: 500
});
const sesv2 = new SESv2Client({ region: REGION, requestHandler: new NodeHttpHandler({ httpsAgent: agent }), retryMode: "standard", maxAttempts: 10 });
const emailContent = readFileSync("email.html").toString();

async function sendEmailBatch(contacts) {
    const results = {
        success: 0,
        skipped: 0,
        errors: 0,
        errorDetails: [],
    };

    for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const emailNumber = i + 1;

        if (!isValidEmail(contact.EmailAddress)) {
            console.log(
                `Skipping invalid email: ${contact.EmailAddress} (${emailNumber}/${contacts.length})`
            );
            results.skipped++;
            continue;
        }

        try {
            const emailParams = {
                FromEmailAddress: FROM_EMAIL,
                Destination: {
                    ToAddresses: [contact.EmailAddress],
                },
                Content: {
                    Simple: {
                        Subject: {
                            Data: SUBJECT_LINE,
                            Charset: "UTF-8",
                        },
                        Body: {
                            Html: {
                                Data: handlePlaceholders(emailContent, contact),
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

            if (DRY_RUN) {
                console.log(
                    `[DRY RUN] Would send email to ${contact.EmailAddress} (${emailNumber}/${contacts.length})`
                );
                results.success++;
            } else {
                const result = await sesv2.send(new SendEmailCommand(emailParams));
                console.log(
                    `Sent to ${contact.EmailAddress} - MessageId: ${result.MessageId} (${emailNumber}/${contacts.length})`
                );
                results.success++;
            }
        } catch (error) {
            console.error(
                `Failed to send to ${contact.EmailAddress} (${emailNumber}/${contacts.length}):`,
                error.message
            );
            results.errors++;
            results.errorDetails.push({
                email: contact.EmailAddress,
                error: error.message,
                code: error.name,
            });

            if (error.name === "Throttling" || error.name === "TooManyRequestsException") {
                console.log("Rate limit detected, adding extra delay...");
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }
    return results;
}

function handlePlaceholders(template, contact) {
    console.log(JSON.stringify(contact, null, 2));
    for (let [key, value] of Object.entries(JSON.parse(contact.AttributesData) || {})) {
        if (ALLOWED_PLACEHOLDERS.includes(key)) {
            const placeholder = `{{${key}}}`;
            if(key === "name") {
                value = value.indexOf(" ") >= 0 ? value.split(" ")[0] : value;
                if(!value || value.trim().length === 0) {
                    value = "there";
                }
            }
            template = template.replace(new RegExp(placeholder, 'g'), value);
        }
    }
    return template;
}

async function getAllContactsFromList(fetchFullDetails = FETCH_FULL_CONTACT_DETAILS) {
    let contacts = [];
    let nextToken = undefined;

    do {
        const response = await sesv2.send(
            new ListContactsCommand({
                ContactListName: CONTACT_LIST_NAME,
                NextToken: nextToken,
            })
        );
        if (response.Contacts) {
            contacts.push(...response.Contacts);
        }
        nextToken = response.NextToken;
    } while (nextToken);

    if (testEmail.length > 0) {
        contacts = contacts.filter(c => testEmail == c.EmailAddress);
        console.log(`Filtered to ${contacts.length} test email only.`);
    }

    if (!fetchFullDetails) {
        return contacts;
    }

    const fullContacts = [];
    for (let i = 0; i < contacts.length; i++) {
        const result = sesv2
            .send(
                new GetContactCommand({
                    ContactListName: CONTACT_LIST_NAME,
                    EmailAddress: contacts[i].EmailAddress,
                })
            )
            .catch((err) => {
                console.error(`Failed to fetch contact ${contacts[i].EmailAddress}:`, err.message);
                return null;
            });

        fullContacts.push(await result);
        console.log(`Fetched ${i + 1}/${contacts.length} contacts`);
    }
    return fullContacts.filter((c) => c !== null);
}

async function sendEmailsToUsers() {
    console.log(
        `Starting SCU Schedule Helper email campaign ${DRY_RUN ? "[DRY RUN MODE]" : ""}`
    );
    console.log(`From: ${FROM_EMAIL}`);
    console.log(`Using contact list: ${CONTACT_LIST_NAME}\n`);

    const contacts = await getAllContactsFromList();
    console.log(`Found ${contacts.length} total users in contact list.`);

    if (contacts.length === 0) {
        return;
    }

    if (!DRY_RUN) {
        console.log(`\nNotice: This will send ${contacts.length} real emails!`);
        console.log(
            "Press Ctrl+C to cancel, or wait 5 seconds to continue...\n"
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const results = await sendEmailBatch(contacts);
    console.log(`Successfully sent: ${results.success} emails`);
    console.log(`Skipped (invalid emails): ${results.skipped} emails`);
    console.log(`Errors: ${results.errors} emails`);
    console.log(
        `Total processed: ${results.success + results.skipped + results.errors} emails`
    );

    if (results.errors > 0) {
        console.log("\nError Details:");
        results.errorDetails.forEach((error) => {
            console.log(
                `   • ${error.email}: ${error.error} (${error.code || "Unknown"})`
            );
        });
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

sendEmailsToUsers()
