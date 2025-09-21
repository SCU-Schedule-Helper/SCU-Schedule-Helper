const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-west-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sesv2 = new AWS.SESV2();

const CONTACT_LIST_NAME = 'SCU-Schedule-Helper-Users';
const DYNAMODB_TABLE = 'SCU-Schedule-Helper';
const BATCH_SIZE = 10; //aws ses rate limit is 14 emails per second
const BATCH_DELAY = 1000; 
const DRY_RUN = process.argv.includes('--dry-run');

async function createContactListIfNotExists() {
    try {
        await sesv2.getContactList({ ContactListName: CONTACT_LIST_NAME }).promise();
        console.log(`Contact list '${CONTACT_LIST_NAME}' already exists`);
    } catch (error) {
        if (error.code === 'NotFoundException') {
            console.log(`Creating contact list '${CONTACT_LIST_NAME}'...`);
            await sesv2.createContactList({
                ContactListName: CONTACT_LIST_NAME,
                Description: 'Users subscribed to SCU Schedule Helper updates',
                Topics: [
                    {
                        TopicName: 'announcements',
                        DisplayName: 'Announcements', 
                        Description: 'Announcements and updates to SCU Schedule Helper',
                        DefaultSubscriptionStatus: 'OPT_IN'
                    }
                ]
            }).promise();
            console.log('Contact list created successfully');
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
            ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
        };
        
        const result = await dynamodb.scan(params).promise();
        allUsers.push(...result.Items);
        lastEvaluatedKey = result.LastEvaluatedKey;
        
        console.log(`Fetched ${result.Items.length} users, total so far: ${allUsers.length}`);
        
    } while (lastEvaluatedKey);
    
    return allUsers;
}

async function addContactsBatch(contacts) {
    const results = {
        success: 0,
        skipped: 0,
        errors: 0
    };
    
    console.log(`📝 Processing ${contacts.length} contacts...`);
    console.log(`⏱️ Rate: ${BATCH_SIZE} contacts per second`);
    console.log(`⏱️ Estimated time: ~${Math.ceil(contacts.length / BATCH_SIZE)} seconds\n`);
    
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
        
        console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts)`);
        
        // Process batch in parallel for speed (within the 1-second window)
        const promises = batch.map(async (contact, index) => {
            if (!contact.email || !isValidEmail(contact.email)) {
                console.log(`⚠️ Skipping invalid email: ${contact.email || 'undefined'}`);
                results.skipped++;
                return;
            }
            
            try {
                const contactParams = {
                    ContactListName: CONTACT_LIST_NAME,
                    EmailAddress: contact.email,
                    TopicPreferences: [
                        {
                            TopicName: 'announcements',
                            SubscriptionStatus: 'OPT_IN'
                        }
                    ],
                    UnsubscribeAll: false,
                    ...(contact.name && { 
                        AttributesData: JSON.stringify({ name: contact.name }) 
                    })
                };
                
                if (DRY_RUN) {
                    console.log(`🔍 [DRY RUN] Would add ${contact.email} (${i + index + 1}/${contacts.length})`);
                    results.success++;
                } else {
                    await sesv2.createContact(contactParams).promise();
                    console.log(`✅ Added ${contact.email} (${i + index + 1}/${contacts.length})`);
                    results.success++;
                }
                
            } catch (error) {
                if (error.code === 'AlreadyExistsException') {
                    console.log(`⚠️ ${contact.email} already exists (${i + index + 1}/${contacts.length})`);
                    results.skipped++;
                } else if (error.code === 'TooManyRequestsException' || error.message.includes('Rate exceeded')) {
                    console.log(`⏸️ Rate limit hit for ${contact.email}, will retry in next batch`);
                    results.errors++;
                } else {
                    console.error(`❌ Error adding ${contact.email}:`, error.message);
                    results.errors++;
                }
            }
        });
        
        await Promise.all(promises);
        
        // Wait 1 second between batches (except for the last batch)
        if (i + BATCH_SIZE < contacts.length) {
            if (!DRY_RUN) {
                console.log(`⏳ Waiting ${BATCH_DELAY/1000} second before next batch...\n`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            } else {
                // Shorter delay for dry run
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }
    
    return results;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function migrateUsersToSESContactList() {
    try {
        console.log(`🚀 Starting automated migration from DynamoDB to SES Contact List...${DRY_RUN ? ' [DRY RUN MODE]' : ''}`);
        
        // 1. Create contact list if it doesn't exist
        if (!DRY_RUN) {
            await createContactListIfNotExists();
        } else {
            console.log('🔍 [DRY RUN] Skipping contact list creation');
        }
        
        console.log('\n📥 Fetching all users from DynamoDB...');
        const users = await getAllUsersFromDynamoDB();
        console.log(`Found ${users.length} total users in DynamoDB`);
        
        const usersWithEmails = users.filter(user => user.email);
        console.log(`${usersWithEmails.length} users have email addresses`);
        
        console.log('\n📤 Adding users to SES Contact List...');
        const results = await addContactsBatch(usersWithEmails);
        
        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully added: ${results.success} contacts`);
        console.log(`⚠️ Skipped (duplicates/invalid): ${results.skipped} contacts`);
        console.log(`❌ Errors: ${results.errors} contacts`);
        console.log(`📧 Total processed: ${results.success + results.skipped + results.errors} contacts`);
        
        console.log('\n🎉 Migration completed!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
if (require.main === module) {
    migrateUsersToSESContactList()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}