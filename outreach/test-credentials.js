const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-west-1' });

// Test script to verify AWS credentials work
async function testCredentials() {
    try {
        const sts = new AWS.STS();
        const identity = await sts.getCallerIdentity().promise();
        console.log('AWS Access confirmed');
        console.log(`   Account: ${identity.Account}`);
        console.log(`   User: ${identity.Arn}`);
        
        // Test DynamoDB access
        const dynamodb = new AWS.DynamoDB.DocumentClient();
        const result = await dynamodb.scan({
            TableName: 'SCU-Schedule-Helper',
            Limit: 1
        }).promise();
        console.log('DynamoDB access confirmed');
        console.log(`   Found ${result.Count} sample records`);
        
        const sesv2 = new AWS.SESV2();
        const contactLists = await sesv2.listContactLists().promise();
        console.log('SES access confirmed');
        console.log(`   Found ${contactLists.ContactLists.length} contact lists`);
        
        console.log('All credentials working');
        
    } catch (error) {
        console.error('Credential test failed:', error.message);
    }
}

testCredentials();