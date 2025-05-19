#!/bin/bash
set -e

# Glean Technical Enablement CDK Deployment Script

# Default values
AWS_PROFILE=""
BEDROCK_AGENT_ID=""
BEDROCK_AGENT_ALIAS=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -p|--profile)
        AWS_PROFILE="$2"
        shift # past argument
        shift # past value
        ;;
        -a|--agent-id)
        BEDROCK_AGENT_ID="$2"
        shift # past argument
        shift # past value
        ;;
        -l|--agent-alias)
        BEDROCK_AGENT_ALIAS="$2"
        shift # past argument
        shift # past value
        ;;
        *)    # unknown option
        shift # past argument
        ;;
    esac
done

echo "========================================"
echo "Glean Technical Enablement Simulator Deployment"
echo "========================================"

# Set AWS profile if specified
if [ ! -z "$AWS_PROFILE" ]; then
    echo "Using AWS profile: $AWS_PROFILE"
    export AWS_PROFILE
    # For AWS SSO profiles that are in ~/.aws/config instead of ~/.aws/credentials
    export AWS_SDK_LOAD_CONFIG=1
fi

# Check if Bedrock Agent ID and Alias are provided
if [ -z "$BEDROCK_AGENT_ID" ]; then
    echo "Bedrock Agent ID not provided. Using default value."
    BEDROCK_AGENT_ID="your-agent-id"
fi

if [ -z "$BEDROCK_AGENT_ALIAS" ]; then
    echo "Bedrock Agent Alias not provided. Using default value."
    BEDROCK_AGENT_ALIAS="your-agent-alias"
fi

echo "Using Bedrock Agent ID: $BEDROCK_AGENT_ID"
echo "Using Bedrock Agent Alias: $BEDROCK_AGENT_ALIAS"

# Export environment variables for CDK
export BEDROCK_AGENT_ID=$BEDROCK_AGENT_ID
export BEDROCK_AGENT_ALIAS=$BEDROCK_AGENT_ALIAS

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required for this script. Please install it first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing project dependencies..."
    npm install
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Build TypeScript
echo "Building TypeScript files..."
# First clean any previous build
rm -rf ./build 2>/dev/null || true

# Then run the build
npx tsc

# Update PATH to include node_modules/.bin
export PATH="$PATH:./node_modules/.bin"

# Deploy CDK Stack (Initial deployment without frontend)
echo "Deploying backend infrastructure..."
if [ ! -z "$AWS_PROFILE" ]; then
    npx cdk deploy --profile "$AWS_PROFILE" --outputs-file cdk-outputs.json --require-approval never
else
    npx cdk deploy --outputs-file cdk-outputs.json --require-approval never
fi

# Check if deployment was successful
if [ $? -ne 0 ]; then
    echo "CDK deployment failed."
    exit 1
fi

echo "Backend infrastructure deployed successfully!"

# Get outputs from the first deployment
USER_POOL_ID=$(cat cdk-outputs.json | jq -r '.GleanTechnicalEnablementStack.UserPoolId')
USER_POOL_CLIENT_ID=$(cat cdk-outputs.json | jq -r '.GleanTechnicalEnablementStack.UserPoolClientId')
API_ENDPOINT=$(cat cdk-outputs.json | jq -r '.GleanTechnicalEnablementStack.ApiEndpoint')
WEBSITE_URL=$(cat cdk-outputs.json | jq -r '.GleanTechnicalEnablementStack.WebsiteURL')
SCENARIO_TABLE_NAME=$(cat cdk-outputs.json | jq -r '.GleanTechnicalEnablementStack.ScenarioTableName' 2>/dev/null || echo "")

echo "========================================"
echo "Backend Deployment Outputs:"
echo "UserPoolId: $USER_POOL_ID"
echo "UserPoolClientId: $USER_POOL_CLIENT_ID"
echo "ApiEndpoint: $API_ENDPOINT"
echo "WebsiteURL: $WEBSITE_URL"
echo "BedrockAgentId: $BEDROCK_AGENT_ID"
echo "BedrockAgentAlias: $BEDROCK_AGENT_ALIAS"
echo "========================================"

# Create .env file for the frontend
echo "Creating frontend environment file..."
cat > frontend/.env << EOF
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_API_ENDPOINT=$API_ENDPOINT
REACT_APP_BEDROCK_AGENT_ID=$BEDROCK_AGENT_ID
REACT_APP_BEDROCK_AGENT_ALIAS=$BEDROCK_AGENT_ALIAS
EOF

# Build the frontend
echo "Building frontend application..."
mkdir -p frontend/build
cd frontend
npm run build
cd ..

# Check if frontend build was successful
if [ ! -d "frontend/build" ] || [ ! -f "frontend/build/index.html" ]; then
    echo "Frontend build failed or build directory is empty."
    exit 1
fi

echo "Frontend built successfully!"

# Seed initial data if table name is available and user chooses to
if [ ! -z "$SCENARIO_TABLE_NAME" ]; then
    echo "Do you want to seed initial scenario data? (y/n)"
    read -r SEED_DATA

    if [[ "$SEED_DATA" =~ ^[Yy]$ ]]; then
        echo "Seeding initial scenario data..."
        export SCENARIO_TABLE_NAME
        if [ ! -z "$AWS_PROFILE" ]; then
            node scripts/seed-scenarios.js --profile "$AWS_PROFILE"
        else
            node scripts/seed-scenarios.js
        fi
        echo "Data seeding complete!"
    fi
fi

echo "========================================"
echo "Deployment complete!"
echo "You can now access your application at: $WEBSITE_URL"
echo "========================================"
