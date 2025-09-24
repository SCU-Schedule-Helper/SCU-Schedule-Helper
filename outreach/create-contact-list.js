import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SESv2Client, GetContactListCommand, CreateContactListCommand, CreateContactCommand } from "@aws-sdk/client-sesv2";

const CONTACT_LIST_NAME = "SCU-Schedule-Helper-Users";
const DYNAMODB_TABLE = "SCU-Schedule-Helper";
const DRY_RUN = process.argv.includes("--dry-run");
const REGION = "us-west-1";

const dynamodbClient = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const sesv2 = new SESv2Client({ region: REGION });

async function createContactListIfNotExists() {
  try {
    await sesv2.send(new GetContactListCommand({ ContactListName: CONTACT_LIST_NAME }));
    console.log(`Contact list '${CONTACT_LIST_NAME}' already exists`);
  } catch (error) {
    if (error.name === "NotFoundException") {
      console.log(`Creating contact list '${CONTACT_LIST_NAME}'...`);
      await sesv2.send(
        new CreateContactListCommand({
          ContactListName: CONTACT_LIST_NAME,
          Description: "Users subscribed to SCU Schedule Helper updates",
          Topics: [
            {
              TopicName: "announcements",
              DisplayName: "Announcements",
              Description: "Announcements and updates to SCU Schedule Helper",
              DefaultSubscriptionStatus: "OPT_IN",
            },
          ],
        })
      );
      console.log("Contact list created successfully");
    } else {
      throw error;
    }
  }
}

async function getAllUsersFromDynamoDB() {
  const allUsers = [];
  let lastEvaluatedKey = null;

  do {
    const params = {
      TableName: DYNAMODB_TABLE,
      FilterExpression: "begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":sk": "info#personal",
      },
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    };

    const result = await dynamodb.send(new ScanCommand(params));
    allUsers.push(...(result.Items ?? []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allUsers;
}

async function addContacts(contacts) {
  const results = {
    success: 0,
    skipped: 0,
    errors: 0,
  };

  for (let i = 0; i < contacts.length; i++) {
    if (!isValidEmail(contacts[i].email)) {
      console.log(`Skipping invalid email: ${contacts[i].email || "undefined"}`);
      results.skipped++;
      continue;
    }

    try {
      const contactParams = {
        ContactListName: CONTACT_LIST_NAME,
        EmailAddress: contacts[i].email,
        TopicPreferences: [
          {
            TopicName: "announcements",
            SubscriptionStatus: "OPT_IN",
          },
        ],
        UnsubscribeAll: false,
        ...(contacts[i].name && {
          AttributesData: JSON.stringify({ name: contacts[i].name }),
        }),
      };

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would add ${contacts[i].email} (${i + 1}/${contacts.length})`);
        results.success++;
      } else {
        await sesv2.send(new CreateContactCommand(contactParams));
        console.log(`Added ${contacts[i].email} (${i + 1}/${contacts.length})`);
        results.success++;
      }
    } catch (error) {
      console.error(`Error adding ${contacts[i].email}:`, error.message);
      results.errors++;
    }
  }

  return results;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function migrateUsersToSESContactList() {
  if (!DRY_RUN) {
    await createContactListIfNotExists();
  } else {
    console.log("[DRY RUN] Skipping contact list creation");
  }

  console.log("Fetching all users from DynamoDB...");
  const users = await getAllUsersFromDynamoDB();
  console.log(`Found ${users.length} users`);

  console.log("\nAdding users to SES Contact List...");
  const results = await addContacts(users);

  console.log(`Successfully added: ${results.success} contacts`);
  console.log(`Skipped (invalid): ${results.skipped} contacts`);
  console.log(`Errors: ${results.errors} contacts`);
  console.log(`Total processed: ${results.success + results.skipped + results.errors} contacts`);
}

migrateUsersToSESContactList();