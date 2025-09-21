Steps to run n8n (Docker or npx) and import `workflow.json`.

Option A: Docker

    1. Install Docker
    2. Start n8n using Docker Compose

    cd outreach
    docker compose up -d


    This starts n8n on `http://localhost:5679` (as configured in `docker-compose.yml`).

    3. Open n8n
    - Visit `http://localhost:5679` in your browser
    - Complete initial setup (admin user) if prompted

    4. Stop n8n

    docker compose down

Option B: npx

    1. Have Node.js 18+ and npm (npx comes with npm)

    2. Start n8n using npx

    cd outreach
    npx -y n8n@latest start

    This starts n8n on `http://localhost:5678`. Leave the terminal open.

    3. Stop n8n
    -Press `Ctrl + C` in the terminal where n8n is running

Import the workflow
1. In n8n UI: go to "create workflow" -> three dots in top right -> import from file
2. Select `workflow.json` from this folder
3. Click "Save"

Run the workflow
1. Setup AWS Credential
    a. Tap into the "Get users" node
    b. Under "Credential to connect with" tap create new credential, and select AWS
    c. Use the credentials for n8n-newsletter-user in the Google Drive "Other Secrets" doc
2. Write/copy paste message into the "body field" in the SES node
3. Click execute workflow

Other info:
Docker start URL: `http://localhost:5679` (per `docker-compose.yml`).

npx start URL: `http://localhost:5678` by default.

To use a different port with npx: `N8N_PORT=5680 npx -y n8n@latest start` and open `http://localhost:5680`.

Adding to AWS SES contactlist

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

Sending Emails:

    Testing: 
    
    -In test-email.js, change email to the test email recipient 
            
    -In send-email.js, create the html for the message in the "Message" variable

    -Run node test-email.js --dry-run to test sending without sending actual emails

    Sending Emails:

    -Run node test-email.js (adjust pauses accordingly to rate limit)




