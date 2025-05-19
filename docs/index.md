# Glean Technical Enablement Simulator Documentation

Welcome to the documentation for the Glean Technical Enablement Simulator project. This index provides an overview of all available documentation resources.

## Architecture & Design

- [Architecture Overview](./architecture-diagram.md) - Mermaid diagram source for the system architecture
- [Architecture Diagram (PNG)](./architecture-diagram.png) - Visual representation of the system architecture

## Guides & Tutorials

- [Getting Started Guide](./getting-started.md) - Instructions for setting up and beginning development
- [Troubleshooting Guide](./troubleshooting-guide.md) - Solutions for common issues and error scenarios

## Development Resources

- [PR Review Checklist](./pr-review-checklist.md) - Quality checklist for reviewing pull requests

## Project Documentation

- [README](../README.md) - Main project documentation with overview, deployment instructions, and general information

## Utilities

- [Generate Diagram Script](./generate-diagram.js) - Node.js script to generate the architecture diagram PNG from the Mermaid source

## Project Structure

The Glean Technical Enablement Simulator is organized into several key components:

1. **Frontend** (`/frontend`)
   - React-based web interface
   - Chatbot interface components
   - User authentication flow

2. **Backend** (`/lambda`)
   - Serverless Lambda functions
   - API integration with Amazon Bedrock
   - Data management services

3. **Infrastructure** (`/lib`)
   - AWS CDK stack definitions
   - Resource configurations
   - Deployment settings

4. **Deployment Scripts** (root directory)
   - Main deployment script (`deploy.sh`)
   - Frontend-only deployment (`deploy-frontend.sh`, `frontend-deploy-cli.js`)
   - AWS SSO helper (`aws-sso-helper.sh`)

5. **Documentation** (`/docs`)
   - This documentation collection
   - Architecture diagrams
   - Development guides

## Additional Resources

For specific component documentation, refer to the respective directories:

- Frontend components: `frontend/src/components/`
- Lambda functions: `lambda/`
- CDK infrastructure: `lib/`
- Deployment scripts: Project root directory

## Contributing to Documentation

To improve this documentation:

1. Create or modify Markdown files in the `docs/` directory
2. Update this index when adding new documentation files
3. For diagram changes, edit `architecture-diagram.md` and regenerate the PNG using:
   ```bash
   node docs/generate-diagram.js
   ```
4. Submit a pull request following the [PR review checklist](./pr-review-checklist.md)
