const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-west-1' });

const sesv2 = new AWS.SESV2();

const CONTACT_LIST_NAME = 'SCU-Schedule-Helper-Users';
const FROM_EMAIL = 'scuschedulehelper@gmail.com';

const TEST_EMAIL = 'dduong2@scu.edu'; 

const HTML_TEMPLATE = `
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

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function sendTestEmail(testEmail) {
    try {
        console.log('Sending test emai');
        console.log(`From: ${FROM_EMAIL}`);
        console.log(`To: ${testEmail}`);
        console.log(`Using contact list: ${CONTACT_LIST_NAME}\n`);

        if (!isValidEmail(testEmail)) {
            throw new Error(`Invalid email address: ${testEmail}`);
        }

        const emailParams = {
            FromEmailAddress: FROM_EMAIL,
            Destination: {
                ToAddresses: [testEmail]
            },
            Content: {
                Simple: {
                    Subject: {
                        Data: '[TEST] Updates to SCU Schedule Helper',
                        Charset: 'UTF-8'
                    },
                    Body: {
                        Html: {
                            Data: HTML_TEMPLATE,
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

        console.log('📧 Sending email via AWS SES...');
        const result = await sesv2.sendEmail(emailParams).promise();
        
        console.log('Test email sent successfully!');
        
    } catch (error) {
        console.error('Failed to send test email:', error.message);
        
        throw error;
    }
}

async function main() {
    try {
        // Check if email is set
        if (TEST_EMAIL === 'your-email@example.com') {
            console.error('Edit line 8 in this script and replace "your-email@example.com"');
            process.exit(1);
        }

        await sendTestEmail(TEST_EMAIL);
        console.log('Test completed successfully');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}