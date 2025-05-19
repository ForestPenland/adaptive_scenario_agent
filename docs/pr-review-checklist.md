# PR Review Checklist

This checklist is designed to ensure quality and consistency across contributions to the Glean Technical Enablement Simulator project.

## General

- [ ] Code follows the project's style guidelines
- [ ] Changes are covered by unit tests where applicable
- [ ] Documentation has been updated to reflect changes
- [ ] PR has a descriptive title and adequate description
- [ ] Commit messages are clear and follow standard conventions
- [ ] No commented-out code or unnecessary console logs
- [ ] No sensitive information is exposed (credentials, API keys, etc.)

## Frontend

- [ ] UI changes have been tested in multiple browsers
- [ ] Responsive design is maintained (mobile, tablet, desktop)
- [ ] Accessibility considerations have been addressed
- [ ] Component styling is consistent with the rest of the application
- [ ] React component props are properly typed
- [ ] Console shows no warnings or errors
- [ ] Performance impact has been considered

## Backend

- [ ] AWS resource naming is consistent with project conventions
- [ ] Error handling is implemented appropriately
- [ ] Logging provides adequate information for troubleshooting
- [ ] Security best practices are followed
- [ ] Resources have appropriate IAM permissions
- [ ] DynamoDB access patterns are efficient
- [ ] Lambda timeout and memory settings are optimized

## CDK Infrastructure

- [ ] CDK constructs follow best practices
- [ ] Resource removal policies are appropriate
- [ ] CloudFormation template size is manageable
- [ ] Resource dependencies are correctly defined
- [ ] Outputs and exports are correctly configured
- [ ] Infrastructure changes are minimally disruptive

## Chatbot Components

- [ ] Chat UI styling is consistent
- [ ] Message handling logic is robust
- [ ] Response processing handles different formats correctly
- [ ] User experience is smooth and intuitive
- [ ] Error states are handled gracefully

## Security

- [ ] No overly permissive IAM roles
- [ ] Data is encrypted in transit and at rest
- [ ] API endpoints use appropriate authentication
- [ ] Input validation is in place
- [ ] No sensitive information is logged

## Performance

- [ ] Resource usage is reasonable
- [ ] Unnecessary network requests are avoided
- [ ] Large dependencies are avoided where possible
- [ ] Database queries are optimized
- [ ] Client-side rendering is efficient

## Deployment

- [ ] Changes can be deployed without disruption
- [ ] Rollback strategy exists if needed
- [ ] Resource limits and quotas have been considered
- [ ] CloudFront invalidation is handled where needed

## Before Merging

- [ ] All CI/CD checks pass
- [ ] PR has been approved by at least one reviewer
- [ ] All requested changes have been addressed
- [ ] Changes have been tested in a development environment
- [ ] Version numbers have been updated if applicable
