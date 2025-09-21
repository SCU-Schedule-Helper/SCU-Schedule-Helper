Install awscli with Homebrew
brew install awscli

Configure:

aws configure

    - enter details found in "other secrets" google doc
    -json is fine for default output format

Testing configuration:

aws sts get-caller-identity

or

node test-credentials.js

Adding emails to contact list:

node add-to-contactlist.js --dry-run
    - with dry run flag to test

node add-to-contactlist.js
    - to actually add

Sending Emails:

    Testing: 
    
    -In test-email.js, change email to the test email recipient 
            
    -In send-email.js, create the html for the message in the "Message" variable

    -Run node test-email.js --dry-run to test sending without sending actual emails

    Sending Emails:

    -Run node test-email.js (adjust pauses accordingly to rate limit)




