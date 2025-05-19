// TypeScript AWS CDK Infrastructure as Code for Glean Technical Enablement Demo

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
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
      code: lambda.Code.fromAsset('lambda/scenario-manager'),
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
      code: lambda.Code.fromAsset('lambda/response-evaluator'),
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
      code: lambda.Code.fromAsset('lambda/path-adapter'),
      handler: 'index.handler',
      environment: {
        SCENARIO_TABLE_NAME: scenarioTable.tableName,
        LEARNER_PROGRESS_TABLE_NAME: learnerProgressTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });
    
    // Bedrock Chat Lambda for chatbot interface
    const bedrockChatLambda = new lambda.Function(this, 'BedrockChatLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda/bedrock-chat'),
      handler: 'index.handler',
      environment: {
        BEDROCK_AGENT_ID: process.env.BEDROCK_AGENT_ID || 'your-agent-id', // Will be set during deployment
        AGENT_ALIAS: process.env.BEDROCK_AGENT_ALIAS || 'your-agent-alias', // Will be set during deployment
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      role: bedrockRole,
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
    
    // Add new /message endpoint for chatbot
    const message = api.root.addResource('message');
    message.addMethod('POST', new apigateway.LambdaIntegration(bedrockChatLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // 7. Outputs
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
    new cdk.CfnOutput(this, 'ScenarioTableName', { value: scenarioTable.tableName });
  }
}
