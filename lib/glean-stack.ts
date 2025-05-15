import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class GleanTechnicalEnablementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDB Tables
    // Scenario Database Table
    const scenarioTable = new dynamodb.Table(this, 'ScenarioTable', {
      partitionKey: { name: 'scenarioId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
    });
    
    // Learner Progress Table
    const learnerProgressTable = new dynamodb.Table(this, 'LearnerProgressTable', {
      partitionKey: { name: 'learnerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scenarioId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
    });

    // 2. Cognito User Pool for Authentication
    const userPool = new cognito.UserPool(this, 'EnablementUserPool', {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      customAttributes: {
        'role': new cognito.StringAttribute({ mutable: true }), // SE, SA, CSM, Support
        'experience': new cognito.StringAttribute({ mutable: true }), // Beginner, Intermediate, Advanced
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'EnablementUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // 3. IAM Role for Bedrock Access
    const bedrockRole = new iam.Role(this, 'BedrockExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'), // Gives access to Bedrock models
      ],
    });

    // 4. Lambda Functions
    // Scenario Manager Lambda
    const scenarioManagerLambda = new lambda.Function(this, 'ScenarioManagerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda/scenario-manager', {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash', '-c', [
              'npm install',
              'cp -r /asset-input/* /asset-output/',
              'cp -r node_modules /asset-output/'
            ].join(' && ')
          ]
        }
      }),
      handler: 'index.handler',
      environment: {
        SCENARIO_TABLE_NAME: scenarioTable.tableName,
        LEARNER_PROGRESS_TABLE_NAME: learnerProgressTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Response Evaluator Lambda using Bedrock
    const responseEvaluatorLambda = new lambda.Function(this, 'ResponseEvaluatorLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda/response-evaluator', {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash', '-c', [
              'npm install',
              'cp -r /asset-input/* /asset-output/',
              'cp -r node_modules /asset-output/'
            ].join(' && ')
          ]
        }
      }),
      handler: 'index.handler',
      environment: {
        SCENARIO_TABLE_NAME: scenarioTable.tableName,
        LEARNER_PROGRESS_TABLE_NAME: learnerProgressTable.tableName,
        BEDROCK_MODEL_ID: 'anthropic.claude-v2', // Or another model available in Bedrock
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      role: bedrockRole,
    });

    // Path Adapter Lambda
    const pathAdapterLambda = new lambda.Function(this, 'PathAdapterLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda/path-adapter', {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash', '-c', [
              'npm install',
              'cp -r /asset-input/* /asset-output/',
              'cp -r node_modules /asset-output/'
            ].join(' && ')
          ]
        }
      }),
      handler: 'index.handler',
      environment: {
        SCENARIO_TABLE_NAME: scenarioTable.tableName,
        LEARNER_PROGRESS_TABLE_NAME: learnerProgressTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // 5. Permissions
    scenarioTable.grantReadWriteData(scenarioManagerLambda);
    scenarioTable.grantReadData(responseEvaluatorLambda);
    scenarioTable.grantReadData(pathAdapterLambda);
    learnerProgressTable.grantReadWriteData(scenarioManagerLambda);
    learnerProgressTable.grantReadWriteData(responseEvaluatorLambda);
    learnerProgressTable.grantReadWriteData(pathAdapterLambda);

    // 6. API Gateway
    const api = new apigateway.RestApi(this, 'EnablementApi', {
      description: 'API for Glean Technical Enablement Simulator',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Add Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'EnablementAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Resources and Methods
    const scenarios = api.root.addResource('scenarios');
    scenarios.addMethod('GET', new apigateway.LambdaIntegration(scenarioManagerLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    const scenario = scenarios.addResource('{scenarioId}');
    scenario.addMethod('GET', new apigateway.LambdaIntegration(scenarioManagerLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const responses = scenario.addResource('responses');
    responses.addMethod('POST', new apigateway.LambdaIntegration(responseEvaluatorLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const learnerPath = api.root.addResource('learner-path');
    learnerPath.addMethod('GET', new apigateway.LambdaIntegration(pathAdapterLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // 7. Frontend Infrastructure
    // S3 bucket for hosting the React app - NOT using website endpoint
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      // Removed website hosting configuration as we're using S3 as an origin for CloudFront
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
      autoDeleteObjects: true, // For demo purposes
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });
    
    // Create Origin Access Control for CloudFront (newer and recommended over OAI)
    const cfnOriginAccessControl = new cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
        name: 'S3OriginAccessControl',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      }
    });
    
    // CloudFront distribution for the website using Origin Access Control
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        }
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      enableIpv6: true,
    });
    
    // Connect the CloudFront distribution with the Origin Access Control
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '');
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', cfnOriginAccessControl.attrId);
    
    // Create a policy statement that allows CloudFront to access the bucket
    const cloudfrontS3Access = new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [websiteBucket.arnForObjects('*')],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      conditions: {
        StringEquals: {
          // Use specific distribution ARN rather than a wildcard to enhance security
          'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
        },
      },
    });
    
    // Add the policy to the bucket
    websiteBucket.addToResourcePolicy(cloudfrontS3Access);
    
    // Check if frontend/build directory exists before deploying
    // This allows the stack to be deployed even if the frontend hasn't been built yet
    try {
      const fs = require('fs');
      if (fs.existsSync('frontend/build')) {
        // Deployment to S3
        new s3deploy.BucketDeployment(this, 'WebsiteDeployment', {
          sources: [s3deploy.Source.asset('frontend/build')],
          destinationBucket: websiteBucket,
          distribution,
          distributionPaths: ['/*'],
        });
      } else {
        console.log('⚠️ frontend/build directory not found. Frontend will not be deployed in this run.');
        console.log('  Run `cd frontend && npm run build` and then redeploy to update the frontend.');
      }
    } catch (error) {
      console.error('Error checking frontend build directory:', error);
    }

    // 8. Outputs and Exports
    // Regular outputs for information display
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
    new cdk.CfnOutput(this, 'WebsiteURL', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'ScenarioTableName', { value: scenarioTable.tableName });
    
    // Exports that can be used by other stacks (like our frontend deployment script)
    new cdk.CfnOutput(this, 'ExportedBucketName', { 
      value: websiteBucket.bucketName,
      exportName: `${this.stackName}:ExportedBucketName`
    });
    
    new cdk.CfnOutput(this, 'ExportedDistributionId', {
      value: distribution.distributionId,
      exportName: `${this.stackName}:ExportedDistributionId`
    });
    
    new cdk.CfnOutput(this, 'ExportedDistributionDomain', {
      value: distribution.distributionDomainName,
      exportName: `${this.stackName}:ExportedDistributionDomain`
    });
  }
}
