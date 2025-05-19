# Getting Started with Glean Technical Enablement Simulator

This guide covers the initial steps to set up and start working with the Glean Technical Enablement Simulator project.

## Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) v18.x or later
- [AWS CLI](https://aws.amazon.com/cli/) v2
- [AWS CDK](https://aws.amazon.com/cdk/) v2 installed globally (`npm install -g aws-cdk`)
- An AWS account with appropriate permissions
- (Optional) [AWS SSO](https://aws.amazon.com/single-sign-on/) configured if using SSO authentication

## Initial Setup

1. **Clone the repository** (if applicable)

   ```bash
   git clone <repository-url>
   cd adaptive_scenario_agent
   ```

2. **Install dependencies**

   ```bash
   # Install root project dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Configure AWS credentials**

   For standard AWS credentials:
   ```bash
   aws configure
   ```

   For AWS SSO users:
   ```bash
   source ./aws-sso-helper.sh --profile your-profile
   ```

## Development Workflow

### Local Development

1. **Start the frontend development server**

   ```bash
   cd frontend
   npm start
   ```

   This will launch the React application at http://localhost:3000

2. **Testing Lambda functions locally**

   For local Lambda function development, you can use the AWS SAM CLI:

   ```bash
   # Install SAM CLI if not already installed
   npm install -g aws-sam-cli

   # Test a Lambda function
   sam local invoke ResponseEvaluatorLambda --event events/test-event.json
   ```

### Making Changes

1. **Frontend changes**

   - Edit files in the `frontend/src` directory
   - Test locally with `npm start`
   - Build for production with `npm run build`

2. **Backend changes**

   - Modify Lambda functions in the `lambda/` directory
   - Update infrastructure in `lib/glean-stack.ts`
   - Synthesize the CloudFormation template with `npm run cdk synth`

3. **Chatbot customization**

   - Modify files in `frontend/src/components/ChatBot/` directory
   - Key files:
     - `index.jsx` - Main component structure
     - `config.jsx` - Configuration settings
     - `css_overrides.css` - Styling overrides
     - `ActionProvider.jsx` - Message handling logic

## Deployment

### Full Stack Deployment

To deploy the complete stack:

```bash
# Build TypeScript files
npm run build

# Deploy the CDK stack
./deploy.sh --profile your-aws-profile
```

### Frontend-Only Updates

For frontend changes only:

```bash
# Build the React app
cd frontend
npm run build
cd ..

# Deploy just the frontend
node ./frontend-deploy-cli.js --profile your-aws-profile
```

## Testing the Deployment

1. Access the application at the CloudFront URL output from the deployment
2. Sign up for a new account or log in with existing credentials
3. Select a scenario and test the user flow
4. Try the chatbot functionality by clicking the chat icon

## Common Issues and Troubleshooting

- **AWS SSO token expired**: Run `source ./aws-sso-helper.sh` again
- **Frontend not updated after deployment**: Check for CloudFront cache issues and invalidate if needed
- **Chatbot not responding**: Verify the Bedrock agent ID and alias are correctly configured

## Accessing Logs and Monitoring

- CloudWatch Logs: Check Lambda function logs for errors
- CloudWatch Metrics: Monitor performance metrics
- S3 Access Logs: Review bucket access patterns (if enabled)
- CloudFront Logs: Analyze distribution traffic (if enabled)

## Next Steps

- Explore the scenarios in the DynamoDB table
- Create custom scenarios using the seed script as a reference
- Enhance the evaluation logic in the response-evaluator Lambda
- Extend the frontend with additional features
