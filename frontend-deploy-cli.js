#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get CLI arguments
const args = process.argv.slice(2);
const profileArg = args.find((arg, index) => 
  (arg === '-p' || arg === '--profile') && args.length > index + 1
);
const profile = profileArg ? args[args.indexOf(profileArg) + 1] : null;

// Set environment variables for AWS credentials
if (profile) {
  console.log(`Using AWS profile: ${profile}`);
  process.env.AWS_PROFILE = profile;
}

// CRITICAL: These environment variables must be set for SSO profiles to work properly
process.env.AWS_SDK_LOAD_CONFIG = '1';
process.env.AWS_CREDENTIAL_PROCESS_ALLOW = '1';

// Check that frontend is built
if (!fs.existsSync('./frontend/build') || !fs.existsSync('./frontend/build/index.html')) {
  console.error('Error: frontend/build directory not found or empty.');
  console.error('Please run \'cd frontend && npm run build\' first.');
  process.exit(1);
}

// Check if cdk-outputs.json exists, which is needed for bucket/distribution information
if (!fs.existsSync('./cdk-outputs.json')) {
  console.error('Error: cdk-outputs.json not found.');
  console.error('Please run the initial deployment with \'./deploy.sh\' first.');
  process.exit(1);
}

// Verify AWS credentials
console.log('Verifying AWS credentials...');
try {
  const credentials = execSync(
    profile ? `aws sts get-caller-identity --profile ${profile}` : 'aws sts get-caller-identity',
    { encoding: 'utf8' }
  );
  console.log('✅ AWS credentials verified');
  console.log(credentials);
} catch (err) {
  console.error('❌ Failed to verify AWS credentials');
  console.error(err.message);
  console.log('\nTry running the aws-sso-helper.sh script first:');
  console.log('  source ./aws-sso-helper.sh');
  process.exit(1);
}

console.log('Deploying frontend to S3...');

// Create a direct AWS CLI command for uploading to S3 - this is a more reliable approach
try {
  // First get bucket and distribution information from the outputs
  const outputs = JSON.parse(fs.readFileSync('./cdk-outputs.json', 'utf8'));
  const stackName = Object.keys(outputs)[0]; // Usually GleanTechnicalEnablementStack
  
  // Look for the bucket name
  const bucketNameOutput = outputs[stackName].ExportedBucketName;
  const distributionId = outputs[stackName].ExportedDistributionId;
  
  if (!bucketNameOutput) {
    console.error('Error: Could not find bucket name in CDK outputs');
    process.exit(1);
  }
  
  // Upload the frontend build to S3
  console.log(`Uploading frontend to bucket: ${bucketNameOutput}`);
  const syncCommand = profile 
    ? `aws s3 sync ./frontend/build s3://${bucketNameOutput} --delete --profile ${profile}`
    : `aws s3 sync ./frontend/build s3://${bucketNameOutput} --delete`;
    
  execSync(syncCommand, { stdio: 'inherit' });
  
  // Make sure the content types are set correctly for the files
  console.log('Setting proper content types for files...');
  
  // Set content type for HTML files
  const htmlCommand = profile
    ? `aws s3 cp s3://${bucketNameOutput}/ s3://${bucketNameOutput}/ --recursive --metadata-directive REPLACE --exclude "*" --include "*.html" --content-type "text/html" --profile ${profile}`
    : `aws s3 cp s3://${bucketNameOutput}/ s3://${bucketNameOutput}/ --recursive --metadata-directive REPLACE --exclude "*" --include "*.html" --content-type "text/html"`;
  
  execSync(htmlCommand, { stdio: 'inherit' });
  
  // Set content type for JS files
  const jsCommand = profile
    ? `aws s3 cp s3://${bucketNameOutput}/ s3://${bucketNameOutput}/ --recursive --metadata-directive REPLACE --exclude "*" --include "*.js" --content-type "application/javascript" --profile ${profile}`
    : `aws s3 cp s3://${bucketNameOutput}/ s3://${bucketNameOutput}/ --recursive --metadata-directive REPLACE --exclude "*" --include "*.js" --content-type "application/javascript"`;
  
  execSync(jsCommand, { stdio: 'inherit' });
  
  // Set content type for CSS files
  const cssCommand = profile
    ? `aws s3 cp s3://${bucketNameOutput}/ s3://${bucketNameOutput}/ --recursive --metadata-directive REPLACE --exclude "*" --include "*.css" --content-type "text/css" --profile ${profile}`
    : `aws s3 cp s3://${bucketNameOutput}/ s3://${bucketNameOutput}/ --recursive --metadata-directive REPLACE --exclude "*" --include "*.css" --content-type "text/css"`;
  
  execSync(cssCommand, { stdio: 'inherit' });
  
  // Invalidate CloudFront cache if distribution ID is available
  if (distributionId) {
    console.log(`Invalidating CloudFront cache for distribution: ${distributionId}`);
    const invalidateCommand = profile
      ? `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*" --profile ${profile}`
      : `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`;
      
    execSync(invalidateCommand, { stdio: 'inherit' });
  }
  
  console.log('✅ Frontend deployment successful');
} catch (err) {
  console.error('❌ Frontend deployment failed:');
  console.error(err.message);
  process.exit(1);
}
