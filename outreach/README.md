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
    a. Click the + in the top left
    b. Click create Credential and select AWS
    c. Login to AWS Console and navigate to IAM
    d. Go to users and then n8n-newsletter-user
    e. Get access key 1 and 2 for the respective fields in AWS Credential
    f. Add the credential to the AWS SES node

2. Write/copy paste message into the "body field" in the SES node
3. Click execute workflow

Other info:
Docker start URL: `http://localhost:5679` (per `docker-compose.yml`).

npx start URL: `http://localhost:5678` by default.

To use a different port with npx: `N8N_PORT=5680 npx -y n8n@latest start` and open `http://localhost:5680`.

