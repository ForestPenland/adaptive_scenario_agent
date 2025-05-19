# Troubleshooting Guide

This guide provides solutions to common issues encountered when working with the Glean Technical Enablement Simulator.

## Deployment Issues

### CDK Deployment Failures

#### Bootstrap Error
```
Error: This stack uses assets, so the toolkit stack must be deployed to the environment
```

**Solution**: Run the CDK bootstrap command:
```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

#### Credential Issues

**Symptoms**: Permissions errors during deployment

**Solutions**:
1. Verify AWS credentials are configured correctly
   ```bash
   aws sts get-caller-identity
   ```
2. For AWS SSO users, refresh your credentials:
   ```bash
   source ./aws-sso-helper.sh --profile your-profile
   ```
3. Ensure your IAM role/user has sufficient permissions

#### Infrastructure Update Failures

**Symptoms**: "Update rollback complete" or deployment rolls back automatically

**Solutions**:
1. Check CloudFormation events in the AWS Console for specific errors
2. Look for resource conflicts or quota limits
3. Try deploying resources in smaller batches

### Frontend Deployment Issues

#### S3 Upload Failures

**Symptoms**: Frontend files fail to upload to S3

**Solutions**:
1. Check S3 bucket permissions
2. Verify you're using the correct AWS profile
3. Ensure the bucket exists and you have write permissions

#### CloudFront Cache Problems

**Symptoms**: Updates to the frontend are not reflecting

**Solutions**:
1. Create a CloudFront invalidation:
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*" --profile your-profile
   ```
2. Wait a few minutes for the invalidation to complete

## Frontend Issues

### Authentication Problems

#### Login/Registration Not Working

**Symptoms**: Unable to log in or register users

**Solutions**:
1. Verify Cognito User Pool and Client IDs in frontend configuration
2. Check browser console for CORS errors
3. Ensure API Gateway has proper CORS settings
4. Verify OAuth flows are configured correctly in Cognito

#### User Session Expiration

**Symptoms**: Frequent logouts or authentication failures

**Solutions**:
1. Check token expiration times in Cognito User Pool settings
2. Implement token refresh in the frontend
3. Verify Amplify Auth configuration

### Rendering Problems

#### UI Display Issues

**Symptoms**: Components not rendering correctly or styled improperly

**Solutions**:
1. Verify CSS files are properly loaded
2. Check browser compatibility
3. Inspect element using browser developer tools
4. Clear browser cache

#### Console Errors

**Symptoms**: Errors in the browser console

**Solutions**:
1. Address specific errors as they appear
2. Check for missing dependencies
3. Verify all API endpoints are accessible

## Backend Issues

### Lambda Function Failures

#### Timeouts

**Symptoms**: Lambda functions time out during execution

**Solutions**:
1. Increase timeout setting in the Lambda configuration
2. Optimize code for better performance
3. Consider breaking complex operations into smaller functions

#### Memory Issues

**Symptoms**: "Memory limit exceeded" errors

**Solutions**:
1. Increase memory allocation for the Lambda function
2. Optimize code to use less memory
3. Monitor memory usage with CloudWatch metrics

#### Node.js Version Compatibility

**Symptoms**: "Runtime.ImportModuleError" or similar

**Solutions**:
1. Verify dependencies are compatible with the Node.js version
2. Update the Lambda runtime to a newer Node.js version if needed
3. Check for ES module vs CommonJS issues

### API Gateway Issues

#### CORS Errors

**Symptoms**: "Access-Control-Allow-Origin" errors in browser console

**Solutions**:
1. Ensure CORS is properly configured in API Gateway
2. Verify all required HTTP methods are allowed
3. Add all necessary headers to Access-Control-Allow-Headers

#### 5xx Errors

**Symptoms**: 500 series errors from API Gateway

**Solutions**:
1. Check Lambda function logs in CloudWatch
2. Verify Lambda function permissions
3. Ensure request/response payload formats match expectations

## Chatbot Issues

### Response Problems

#### No Responses from Chatbot

**Symptoms**: Chatbot doesn't respond to messages

**Solutions**:
1. Check Bedrock agent ID and alias in Lambda environment variables
2. Verify Bedrock IAM permissions
3. Look for errors in the bedrock-chat Lambda CloudWatch logs
4. Ensure the session ID is being properly generated and stored

#### Malformed Responses

**Symptoms**: Chatbot responses display incorrectly or with errors

**Solutions**:
1. Review the response parsing logic in ActionProvider.jsx
2. Check for JSON parsing errors
3. Add additional logging to see the raw response format
4. Update the formatting logic to handle the response structure

#### Styling Issues

**Symptoms**: Chat bubbles or UI elements display incorrectly

**Solutions**:
1. Verify CSS files for the chatbot are loaded
2. Update the styling in css_overrides.css and custom_components.css
3. Check component structure in the browser inspector

## DynamoDB Issues

### Data Access Problems

#### Data Not Found

**Symptoms**: Unable to retrieve expected data from DynamoDB

**Solutions**:
1. Verify table names in Lambda environment variables
2. Check partition key and sort key values
3. Ensure IAM permissions allow the appropriate DynamoDB actions
4. Use the AWS Console to verify the data exists in the table

#### Query Performance

**Symptoms**: Slow responses when accessing data

**Solutions**:
1. Review DynamoDB access patterns
2. Consider adding Global Secondary Indexes for common queries
3. Implement DynamoDB caching strategies
4. Use DynamoDB Accelerator (DAX) for high-throughput scenarios

## Monitoring and Debugging

### Enable Enhanced Logging

For detailed troubleshooting:

1. Add additional logging to Lambda functions:
   ```javascript
   console.log('Input payload:', JSON.stringify(event));
   console.log('Processing result:', JSON.stringify(result));
   ```

2. Enable API Gateway execution logging:
   ```bash
   aws apigateway update-stage \
     --rest-api-id YOUR_API_ID \
     --stage-name prod \
     --patch-operations op=replace,path=/accessLogSettings/destinationArn,value=YOUR_LOG_ARN
   ```

3. Enable X-Ray tracing for distributed debugging:
   ```typescript
   // In CDK
   const api = new apigateway.RestApi(this, 'EnablementApi', {
     description: 'API for Glean Technical Enablement Simulator',
     deployOptions: {
       tracingEnabled: true,
     },
   });
   ```

### CloudWatch Alarms

Set up CloudWatch Alarms for proactive monitoring:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-Error-Alarm" \
  --alarm-description "Alarm when Lambda errors exceed threshold" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=FunctionName,Value=YOUR_FUNCTION_NAME \
  --evaluation-periods 1 \
  --alarm-actions YOUR_SNS_TOPIC_ARN
```

## Getting Support

For issues not covered in this guide:

1. Check the AWS documentation for specific services
2. Review project documentation in the `docs/` directory
3. Create an issue in the project repository with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs or error messages
