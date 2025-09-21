import { SESv2Client, CreateContactCommand, DeleteContactCommand } from "@aws-sdk/client-sesv2";

const CONTACT_LIST_NAME = 'SCU-Schedule-Helper-Users';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function createSESClient(region) {
  return new SESv2Client({ 
    region: region,
    maxAttempts: 3,
    retryMode: "standard"
  });
}

export async function addContactToList(email, name, region) {
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

export async function removeContactFromList(email, region) {
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
