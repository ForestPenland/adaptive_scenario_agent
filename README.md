# Glean Technical Enablement Simulator

This project contains a complete AWS CDK deployment for the Glean Technical Enablement Simulator, a platform designed to help GTM teams practice and improve their technical knowledge through AI-powered scenario simulations.

## Architecture

The application consists of:

1. **Backend Infrastructure:**
   - AWS Cognito for user authentication
   - Amazon DynamoDB for storing scenarios and learner progress
   - AWS Lambda for backend logic
   - Amazon API Gateway for REST API endpoints
   - Amazon Bedrock for AI-powered response evaluation

2. **Frontend Application:**
   - React-based single page application
   - Hosted on Amazon S3 with CloudFront distribution
   - Integrates with backend using AWS Amplify

## Directory Structure

```
/
├── bin/                     # CDK app entry point
├── lib/                     # CDK infrastructure code
├── lambda/                  # Lambda function code
│   ├── scenario-manager/    # Manages scenarios in DynamoDB
│   ├── response-evaluator/  # Evaluates responses using Bedrock
│   └── path-adapter/        # Adapts learning paths based on progress
├── frontend/                # React frontend application
├── scripts/                 # Utility scripts (e.g., for seeding data)
└── cdk.json                 # CDK configuration
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18.x or later
- AWS CDK v2 installed globally (`npm install -g aws-cdk`)
- An AWS account with access to Amazon Bedrock

## Deployment Instructions

### 1. Install Dependencies

```bash
# Install root project dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Build and Deploy Backend

```bash
# Build TypeScript files
npm run build

# Deploy the CDK stack
./deploy.sh

# OR specify an AWS profile to use
./deploy.sh --profile my-aws-profile
```

The deployment will output several values that you'll need for the frontend configuration:
- UserPoolId
- UserPoolClientId
- ApiEndpoint
- WebsiteURL

### 3. Configure the Frontend

Create a `.env` file in the `frontend` directory:

```
REACT_APP_USER_POOL_ID=your_user_pool_id
REACT_APP_USER_POOL_CLIENT_ID=your_user_pool_client_id
REACT_APP_API_ENDPOINT=your_api_endpoint
```

### 4. Build and Deploy the Frontend

The main deployment script automatically builds and deploys the frontend. However, if you need to deploy just the frontend separately (e.g., after making frontend changes), you have several options:

#### Option 1: Using the Node.js CLI tool (Recommended, especially for AWS SSO users)

```bash
# Build the React app
cd frontend
npm run build
cd ..

# Deploy just the frontend
npm run deploy:frontend

# OR specify an AWS profile to use
npm run deploy:frontend -- --profile my-aws-profile
```

#### Option 2: Using the shell script

```bash
# Build the React app
cd frontend
npm run build
cd ..

# Deploy just the frontend
./deploy-frontend.sh

# OR specify an AWS profile to use
./deploy-frontend.sh --profile my-aws-profile
```

The Node.js CLI tool uses direct AWS CLI commands and has better error handling for AWS SSO credentials.

### 5. Seed Initial Data

Load sample scenarios into the database:

```bash
# Set the SCENARIO_TABLE_NAME environment variable to your actual table name
export SCENARIO_TABLE_NAME="GleanTechnicalEnablementStack-ScenarioTable1234567"

# Run the seed script
node scripts/seed-scenarios.js

# OR specify an AWS profile to use
node scripts/seed-scenarios.js --profile my-aws-profile
```

### AWS SSO Profile Support

If you're using AWS SSO (particularly in WSL environments), you might encounter credential issues. We've included a helper script to simplify this process:

```bash
# Run the AWS SSO helper script (it will prompt for profile if not specified)
source ./aws-sso-helper.sh

# Or specify a profile directly
source ./aws-sso-helper.sh --profile my-aws-profile

# After running the helper, you can run other commands that need AWS credentials
node scripts/seed-scenarios.js
```

The helper script will:
1. Check if your SSO session is active
2. Initiate a login if needed
3. Set all necessary environment variables
4. Extract the table name from deployment outputs

## Usage

1. Navigate to the WebsiteURL output from the CDK deployment.
2. Register a new account with your details.
3. Select a scenario to begin.
4. Progress through the stages by responding to customer challenges.
5. Receive AI-powered evaluations of your responses.

## Local Development

### Backend

```bash
# Start a local API for development
npm run cdk synth
```

### Frontend

```bash
cd frontend
npm start
```

## Clean Up

To remove all resources deployed by this project:

```bash
cdk destroy
```

## Security Considerations

- This project uses AWS Cognito for authentication and authorization
- API Gateway endpoints are secured with Cognito authorizers
- Bedrock access is controlled through IAM roles
- For a production deployment, consider enhancing security with:
  - Custom domains with HTTPS
  - WAF configuration
  - More restrictive CORS settings
  - Enhanced encryption options for DynamoDB
## Chatbot Integration

This project includes a floating chatbot interface that connects to an Amazon Bedrock agent. The chatbot provides an interactive way for users to get assistance and information.

### Features

- Floating chat button in the bottom-right corner of the application
- Integration with Amazon Bedrock agent for intelligent responses
- Persistent chat sessions using UUID-based session management
- Responsive design that works on all device sizes

### Deployment

To deploy the application with the chatbot functionality, use the following command:

```bash
./deploy.sh -p <aws-profile> -a <bedrock-agent-id> -l <bedrock-agent-alias>
```

Parameters:
- `-p` or `--profile`: AWS profile to use for deployment
- `-a` or `--agent-id`: Bedrock Agent ID to connect to
- `-l` or `--agent-alias`: Bedrock Agent Alias to use

Example:
```bash
./deploy.sh -p prod-web -a abc123 -l TSTALIASID
```

### Technical Implementation

The chatbot consists of:

1. **Frontend Components**:
   - React-based chatbot using `react-chatbot-kit`
   - Floating button interface
   - Message handling and display

2. **Backend Integration**:
   - Lambda function for processing messages
   - API Gateway endpoint at `/message`
   - Bedrock agent integration

3. **Authentication**:
   - Uses the same Cognito authentication as the main application
   - Secure API calls with JWT tokens
