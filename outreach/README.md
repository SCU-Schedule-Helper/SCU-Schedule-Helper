Install awscli:
- `brew install awscli`

Configuration:

Run `aws configure`

- Enter details found in "other secrets" google doc
- JSON is fine for default output format

Sending Emails:

- Create the html for the message in the "email.html" file
- In test-email.js, change email to the test email recipient 
- Run node test-email.js to send to test users
- Run node send-emails.js when you want to send to all users
- Use the --dry-run flag to avoid actually sending
