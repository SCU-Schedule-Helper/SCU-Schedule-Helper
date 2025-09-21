const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-west-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sesv2 = new AWS.SESV2();

const CONTACT_LIST_NAME = 'SCU-Schedule-Helper-Users';
const DYNAMODB_TABLE = 'SCU-Schedule-Helper';
const FROM_EMAIL = 'scuschedulehelper@gmail.com';
const BATCH_SIZE = 1; 
const BATCH_DELAY = 1000; 
const DRY_RUN = process.argv.includes('--dry-run');

const MESSAGE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SCU Schedule Helper Announcement</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #000; 
            max-width: 600px;
            margin: 0 auto;
        }
        .header { 
            background-color: #f4f4f4; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
        }
        .content { 
            padding: 20px; 
            background-color: #ffffff;
            color: #000;
        }
        .content p {
            color: #000;
        }
        .footer { 
            background-color: #f9f9f9; 
            padding: 15px; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #ddd; 
            border-radius: 0 0 8px 8px;
        }
        .unsubscribe { 
            text-align: center; 
            margin-top: 20px; 
        }
        .share-message {
            text-align: center;
            margin: 15px 0;
            color: #611914;
            font-style: italic;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        h2 {
            color: #611914;
            margin: 0;
        }
        strong {
            color: #000;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>SCU Schedule Helper Update</h2>
    </div>
    <div class="content">
        <p>Hello SCU Schedule Helper user!</p>
        <p>Best regards,<br>
        <strong>SCU Schedule Helper</strong></p>
    </div>
    <div class="footer">
        <div class="share-message">
            <p>If SCU Schedule Helper has made your course planning easier, we'd appreciate if you share it with your friends!</p>
        </div>
        <div class="unsubscribe">
            <p><a href="{{amazonSESUnsubscribeUrl}}">Click here to unsubscribe</a></p>
        </div>
        <p style="text-align: center; margin-top: 15px;">
            SCU Schedule Helper | Santa Clara University
        </p>
    </div>
</body>
</html>
`;

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

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function sendEmailBatch(contacts) {
    const results = {
        success: 0,
        skipped: 0,
        errors: 0,
        errorDetails: []
    };
    
    console.log(`\nSending emails to ${contacts.length} contacts...`);
    console.log(`Rate: ${BATCH_SIZE} email per second`);
    console.log(`Estimated time: ~${Math.ceil(contacts.length / BATCH_SIZE)} seconds\n`);
    
    for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const emailNumber = i + 1;
        
        if (!contact.email || !isValidEmail(contact.email)) {
            console.log(`Skipping invalid email: ${contact.email || 'undefined'} (${emailNumber}/${contacts.length})`);
            results.skipped++;
            continue;
        }
        
        try {
            const emailParams = {
                FromEmailAddress: FROM_EMAIL,
                Destination: {
                    ToAddresses: [contact.email]
                },
                Content: {
                    Simple: {
                        Subject: {
                            Data: 'SCU Schedule Helper Announcement',
                            Charset: 'UTF-8'
                        },
                        Body: {
                            Html: {
                                Data: MESSAGE,
                                Charset: 'UTF-8'
                            }
                        }
                    }
                },
                ListManagementOptions: {
                    ContactListName: CONTACT_LIST_NAME,
                    TopicName: 'announcements'
                }
            };
            
            if (DRY_RUN) {
                console.log(`[DRY RUN] Would send email to ${contact.email} (${emailNumber}/${contacts.length})`);
                results.success++;
            } else {
                const result = await sesv2.sendEmail(emailParams).promise();
                console.log(`Sent to ${contact.email} - MessageId: ${result.MessageId} (${emailNumber}/${contacts.length})`);
                results.success++;
            }
            
        } catch (error) {
            console.error(`Failed to send to ${contact.email} (${emailNumber}/${contacts.length}):`, error.message);
            results.errors++;
            results.errorDetails.push({
                email: contact.email,
                error: error.message,
                code: error.code
            });
            
            if (error.code === 'Throttling' || error.code === 'TooManyRequestsException') {
                console.log('Rate limit detected, adding extra delay...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (i < contacts.length - 1) {
            if (!DRY_RUN) {
                console.log(`Waiting ${BATCH_DELAY/1000} second before next email...`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            } else {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }
    
    return results;
}

async function sendEmailsToUsers() {
    try {
        console.log(`Starting SCU Schedule Helper email campaign...${DRY_RUN ? ' [DRY RUN MODE]' : ''}`);
        console.log(`From: ${FROM_EMAIL}`);
        console.log(`Using contact list: ${CONTACT_LIST_NAME}\n`);
        
        const users = await getAllUsersFromDynamoDB();
        console.log(`Found ${users.length} total users in DynamoDB`);
        
        const usersWithEmails = users.filter(user => user.email && isValidEmail(user.email));
        console.log(`${usersWithEmails.length} users have valid email addresses`);
        
        if (usersWithEmails.length === 0) {
            console.log('No users with valid emails found. Exiting...');
            return;
        }
        
        if (!DRY_RUN) {
            console.log(`\nNotice:This will send ${usersWithEmails.length} real emails!`);
            console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...\n');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        const results = await sendEmailBatch(usersWithEmails);
        
        // Summary
        console.log('\nEmail Campaign Summary:');
        console.log(`Successfully sent: ${results.success} emails`);
        console.log(`Skipped (invalid emails): ${results.skipped} emails`);
        console.log(`Errors: ${results.errors} emails`);
        console.log(`Total processed: ${results.success + results.skipped + results.errors} emails`);
        
        if (results.errors > 0) {
            console.log('\nError Details:');
            results.errorDetails.forEach(error => {
                console.log(`  • ${error.email}: ${error.error} (${error.code || 'Unknown'})`);
            });
        }
        
        console.log('\nEmail campaign completed!');
        
    } catch (error) {
        console.error('Email campaign failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    sendEmailsToUsers()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { sendEmailsToUsers };