#!/bin/bash
# AWS SSO Helper Script - Specifically designed to help with WSL environments
# This script helps with AWS SSO credentials in WSL where there can be additional complications

set -e

# Usage information
function show_usage {
  echo "AWS SSO Helper - Designed to resolve SSO credential issues in WSL"
  echo ""
  echo "Usage: ./aws-sso-helper.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -p, --profile PROFILE   Specify the AWS profile to use"
  echo "  -h, --help              Display this help message"
  echo ""
}

# Default values
AWS_PROFILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -p|--profile)
      AWS_PROFILE="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)    # unknown option
      shift # past argument
      ;;
  esac
done

# If no profile specified, ask for one
if [ -z "$AWS_PROFILE" ]; then
  echo "No AWS profile specified. Available profiles:"
  echo "-------------------------------------"
  aws configure list-profiles
  echo "-------------------------------------"
  echo -n "Enter profile name to use: "
  read -r AWS_PROFILE
fi

# Export required environment variables for SSO
export AWS_SDK_LOAD_CONFIG=1
export AWS_CREDENTIAL_PROCESS_ALLOW=1
export AWS_PROFILE="$AWS_PROFILE"

# Check if AWS SSO session is active
echo "Checking if AWS SSO session is active for profile: $AWS_PROFILE"
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
  echo "SSO session not found or expired. Initiating login..."
  aws sso login --profile "$AWS_PROFILE"
else
  echo "SSO session active and credentials verified!"
fi

# Get identity information to confirm access
identity=$(aws sts get-caller-identity --profile "$AWS_PROFILE")
echo "Successfully authenticated with profile $AWS_PROFILE:"
echo "$identity" | grep "Arn"

# Set up the environment for seeding
echo ""
echo "Setting up environment for DynamoDB operations..."

# Get the scenario table name from outputs
if [ -f "cdk-outputs.json" ]; then
  SCENARIO_TABLE_NAME=$(cat cdk-outputs.json | grep -o '"ScenarioTableName": "[^"]*"' | cut -d '"' -f 4)
  if [ -n "$SCENARIO_TABLE_NAME" ]; then
    echo "Found scenario table name: $SCENARIO_TABLE_NAME"
    export SCENARIO_TABLE_NAME
  else
    echo "Warning: ScenarioTableName not found in cdk-outputs.json"
  fi
else
  echo "Warning: cdk-outputs.json not found, table name might need to be set manually"
fi

echo ""
echo "Environment is now set up for AWS operations with profile: $AWS_PROFILE"
echo "You can now run scripts that require AWS authentication, for example:"
echo "  node scripts/seed-scenarios.js --profile $AWS_PROFILE"
echo ""
echo "Or for convenience, run:"
echo "  source ./aws-sso-helper.sh --profile $AWS_PROFILE && node scripts/seed-scenarios.js"
