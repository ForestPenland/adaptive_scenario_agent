#!/bin/bash
set -e

# Script to only deploy the frontend part of the application
# Useful when you've built the frontend but need to deploy it separately

# Default values
AWS_PROFILE="prod-web"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -p|--profile)
        AWS_PROFILE="$2"
        shift # past argument
        shift # past value
        ;;
        *)    # unknown option
        shift # past argument
        ;;
    esac
done

echo "========================================"
echo "Glean Technical Enablement - Frontend Deployment"
echo "========================================"

# Set AWS profile if specified
if [ ! -z "$AWS_PROFILE" ]; then
    echo "Using AWS profile: $AWS_PROFILE"
    export AWS_PROFILE
    # For AWS SSO profiles that are in ~/.aws/config instead of ~/.aws/credentials
    export AWS_SDK_LOAD_CONFIG=1
fi

# Check for frontend build directory
if [ ! -d "frontend/build" ] || [ ! -f "frontend/build/index.html" ]; then
    echo "Error: frontend/build directory not found or empty."
    echo "Please run 'cd frontend && npm run build' first."
    exit 1
fi

# Update PATH to include node_modules/.bin
export PATH="$PATH:./node_modules/.bin"

# Deploy only the frontend part
echo "Deploying frontend to S3 and CloudFront..."
if [ ! -z "$AWS_PROFILE" ]; then
    # Create a temporary CDK app with proper extension that only deploys the frontend
    TMP_DIR=$(mktemp -d)
    TMP_FILE="$TMP_DIR/frontend-deploy.ts"
    
    cat > "$TMP_FILE" << 'EOF'
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

// Stack that only deploys the frontend to an existing bucket
class FrontendDeploymentStack extends cdk.Stack {
  constructor(scope: any, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Instead of creating new resources, get references to existing ones
    const websiteBucket = s3.Bucket.fromBucketName(this, 'ExistingBucket', 
      cdk.Fn.importValue('GleanTechnicalEnablementStack:ExportedBucketName'));
      
    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'ExistingDistribution', {
      distributionId: cdk.Fn.importValue('GleanTechnicalEnablementStack:ExportedDistributionId'),
      domainName: cdk.Fn.importValue('GleanTechnicalEnablementStack:ExportedDistributionDomain')
    });
    
    // Deploy frontend to S3
    new s3deploy.BucketDeployment(this, 'WebsiteDeployment', {
      sources: [s3deploy.Source.asset('frontend/build')],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });
  }
}

const app = new cdk.App();
new FrontendDeploymentStack(app, 'GleanFrontendDeploymentStack');
EOF
    
    # Run the temporary deployment
    echo "Compiling and running temporary deployment script..."
    npx ts-node "$TMP_FILE"
    npx cdk deploy GleanFrontendDeploymentStack --profile "$AWS_PROFILE" --require-approval never
    
    # Clean up
    rm -rf "$TMP_DIR"
else
    # Without profile - use the same approach with a properly named temporary file
    TMP_DIR=$(mktemp -d)
    TMP_FILE="$TMP_DIR/frontend-deploy.ts"
    
    cat > "$TMP_FILE" << 'EOF'
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

// Stack that only deploys the frontend to an existing bucket
class FrontendDeploymentStack extends cdk.Stack {
  constructor(scope: any, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Instead of creating new resources, get references to existing ones
    const websiteBucket = s3.Bucket.fromBucketName(this, 'ExistingBucket', 
      cdk.Fn.importValue('GleanTechnicalEnablementStack:ExportedBucketName'));
      
    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'ExistingDistribution', {
      distributionId: cdk.Fn.importValue('GleanTechnicalEnablementStack:ExportedDistributionId'),
      domainName: cdk.Fn.importValue('GleanTechnicalEnablementStack:ExportedDistributionDomain')
    });
    
    // Deploy frontend to S3
    new s3deploy.BucketDeployment(this, 'WebsiteDeployment', {
      sources: [s3deploy.Source.asset('frontend/build')],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });
  }
}

const app = new cdk.App();
new FrontendDeploymentStack(app, 'GleanFrontendDeploymentStack');
EOF
    
    # Run the temporary deployment
    echo "Compiling and running temporary deployment script..."
    npx ts-node "$TMP_FILE"
    npx cdk deploy GleanFrontendDeploymentStack --require-approval never
    
    # Clean up
    rm -rf "$TMP_DIR"
fi

echo "Frontend deployment complete!"
