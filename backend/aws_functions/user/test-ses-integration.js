import { SESv2Client, CreateContactCommand, DeleteContactCommand } from "@aws-sdk/client-sesv2";

const CONTACT_LIST_NAME = 'SCU-Schedule-Helper-Users';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TEST_EMAIL = "test123@scu.edu";
const TEST_NAME = "Test User";
const TEST_REGION = process.env.AWS_DDB_REGION || "us-west-1";

function createSESClient(region) {
  return new SESv2Client({ 
    region: region,
    maxAttempts: 3,
    retryMode: "standard"
  });
}

async function addContactToList(email, name, region) {
  const sesClient = createSESClient(region);
  
  const contactParams = {
    ContactListName: CONTACT_LIST_NAME,
    EmailAddress: email,
    TopicPreferences: [
      {
        TopicName: 'announcements',
        SubscriptionStatus: 'OPT_IN'
      }
    ],
    UnsubscribeAll: false,
    ...(name && { 
      AttributesData: JSON.stringify({ name: name }) 
    })
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sesClient.send(new CreateContactCommand(contactParams));
      console.log(`Successfully added ${email} to SES contact list`);
      return true;
    } catch (error) {
      if (error.name === 'AlreadyExistsException') {
        console.log(`Contact ${email} already exists in SES contact list`);
        return true;
      }
      
      console.error(`Attempt ${attempt}/${MAX_RETRIES} failed to add ${email} to SES contact list:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        console.error(`Failed to add ${email} to SES contact list after ${MAX_RETRIES} attempts`);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
  
  return false;
}

async function removeContactFromList(email, region) {
  const sesClient = createSESClient(region);
  
  const deleteParams = {
    ContactListName: CONTACT_LIST_NAME,
    EmailAddress: email
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sesClient.send(new DeleteContactCommand(deleteParams));
      console.log(`Successfully removed ${email} from SES contact list`);
      return true;
    } catch (error) {
      if (error.name === 'NotFoundException') {
        console.log(`Contact ${email} not found in SES contact list (may have been already removed)`);
        return true;
      }
      
      console.error(`Attempt ${attempt}/${MAX_RETRIES} failed to remove ${email} from SES contact list:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        console.error(`Failed to remove ${email} from SES contact list after ${MAX_RETRIES} attempts`);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
  
  return false;
}

async function testSESIntegration() {
  
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`Test Name: ${TEST_NAME}`);
  console.log(`Region: ${TEST_REGION}`);
  console.log("");

  // Test 1: Add contact
  console.log("Test 1: Adding contact to SES list...");
  try {
    const addResult = await addContactToList(TEST_EMAIL, TEST_NAME, TEST_REGION);
    console.log(`Result: ${addResult ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error("Error during add test:", error.message);
  }
  console.log("");

  // Wait a moment
  console.log("Waiting 2 seconds...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log("");

  // Test 2: Try adding same contact again (should handle AlreadyExistsException)
  console.log("Test 2: Adding same contact again (should handle duplicate)...");
  try {
    const addResult2 = await addContactToList(TEST_EMAIL, TEST_NAME, TEST_REGION);
    console.log(`Result: ${addResult2 ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error("Error during duplicate add test:", error.message);
  }
  console.log("Waiting 2 seconds...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log("Test 3: Removing contact from SES list...");
  try {
    const removeResult = await removeContactFromList(TEST_EMAIL, TEST_REGION);
    console.log(`Result: ${removeResult ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error("Error during remove test:", error.message);
  }
  console.log("");

  console.log("Waiting 2 seconds...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log("");

  console.log("Test 4: Removing same contact again (should handle not found)...");
  try {
    const removeResult2 = await removeContactFromList(TEST_EMAIL, TEST_REGION);
    console.log(`Result: ${removeResult2 ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error("Error during duplicate remove test:", error.message);
  }
  console.log("");

  console.log("SES Integration Test Complete!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testSESIntegration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}
