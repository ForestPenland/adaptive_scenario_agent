// Script to seed the DynamoDB table with sample scenarios
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// CRITICAL: These environment variables must be set for SSO profiles to work properly
process.env.AWS_SDK_LOAD_CONFIG = '1'; // Forces SDK to load from ~/.aws/config not just ~/.aws/credentials
process.env.AWS_CREDENTIAL_PROCESS_ALLOW = '1'; // Needed for credential process in .aws/config

// Get command line arguments
const args = process.argv.slice(2);
let profile = null;

// Parse for profile argument
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-p' || args[i] === '--profile') && i + 1 < args.length) {
    profile = args[i + 1];
    break;
  }
}

// Configure AWS SDK - basic initialization with just the region
const region = process.env.AWS_REGION || 'us-east-1';
AWS.config.update({ region });

// If profile specified, set it as an environment variable
if (profile) {
  console.log(`Using AWS profile: ${profile}`);
  process.env.AWS_PROFILE = profile;
}

// Load the scenario data (do this outside the function to be more efficient)
const sampleScenario = JSON.parse(fs.readFileSync(path.join(__dirname, '../sample-scenario-json.json'), 'utf8'));
const additionalScenario = {
  "scenarioId": "cloud-migration-assessment",
  "title": "Enterprise Cloud Migration Assessment",
  "description": "A large healthcare organization is looking to migrate their data and workflows from on-premise systems to a cloud platform. They need assistance in identifying which Glean features would be most beneficial for this transition.",
  "difficulty": "advanced",
  "targetRoles": ["SA", "SE"],
  "learningObjectives": [
    "Demonstrate understanding of cloud migration challenges",
    "Map Glean capabilities to enterprise migration needs",
    "Assess data security considerations in healthcare",
    "Create a phased implementation plan"
  ],
  "scenarioType": "customer meeting simulation",
  "stages": [
    {
      "stageId": "initial-assessment",
      "title": "Initial Technical Assessment",
      "description": "First meeting with the client's technical team to understand their current infrastructure",
      "challenge": "The CTO asks: 'We have over 500 TB of unstructured patient data across legacy systems. How would Glean's architecture handle indexing and searching this data while maintaining HIPAA compliance?'",
      "expectedElements": [
        "Address HIPAA compliance capabilities",
        "Explain Glean's approach to large-scale indexing",
        "Discuss handling of unstructured data",
        "Cover infrastructure requirements for their scale"
      ],
      "technicalPoints": [
        "Glean's multi-tiered access control",
        "Federated search architecture",
        "Incremental indexing for large datasets",
        "Customizable data processing pipelines"
      ],
      "commonMistakes": [
        "Providing generic answers about 'scalability'",
        "Not addressing healthcare-specific compliance",
        "Underestimating the migration challenges",
        "Failing to discuss incremental approach options"
      ],
      "skillTags": ["technical-architecture", "compliance-knowledge", "data-assessment"],
      "passThreshold": 75
    },
    {
      "stageId": "security-discussion",
      "title": "Security and Compliance Deep Dive",
      "description": "Meeting with the security and compliance team to address their specific concerns",
      "challenge": "The CISO states: 'Our patient data is subject to HIPAA, GDPR, and state-level regulations. We need to maintain audit trails for all data access. How exactly does Glean's security model work with these requirements?'",
      "expectedElements": [
        "Explain Glean's audit logging capabilities",
        "Detail the role-based access control system",
        "Address multi-jurisdictional compliance",
        "Discuss encryption standards used"
      ],
      "technicalPoints": [
        "End-to-end encryption methods",
        "Customizable audit trail retention",
        "Attribute-based access controls",
        "Compliance certification details"
      ],
      "commonMistakes": [
        "Giving vague assurances about security",
        "Not knowing specific HIPAA technical requirements",
        "Overpromising compliance features",
        "Missing details on audit capabilities"
      ],
      "skillTags": ["security-governance", "compliance-knowledge", "technical-communication"],
      "passThreshold": 80
    },
    {
      "stageId": "user-adoption",
      "title": "User Adoption Planning",
      "description": "Meeting with department heads to discuss change management and adoption strategies",
      "challenge": "The Head of Clinical Operations explains: 'Our doctors and nurses are very busy and resistant to new technology. How can we ensure they'll actually use Glean efficiently without disrupting patient care?'",
      "expectedElements": [
        "Discuss Glean's user interface simplicity",
        "Recommend a phased training approach",
        "Suggest role-specific use cases",
        "Address integration with existing workflows"
      ],
      "technicalPoints": [
        "Single Sign-On implementation",
        "Customizable user interfaces",
        "Progressive feature rollout options",
        "Workflow integration capabilities"
      ],
      "commonMistakes": [
        "Focusing only on features, not on adoption",
        "Not acknowledging healthcare-specific workflows",
        "Underestimating training needs",
        "Missing opportunities for early quick wins"
      ],
      "skillTags": ["change-management", "user-experience", "stakeholder-management"],
      "passThreshold": 70
    }
  ],
  "adaptationRules": {
    "difficultyIncrease": {
      "conditions": {
        "consecutiveHighScores": 2,
        "averageScore": 85
      },
      "adjustments": {
        "addComplexity": true,
        "introduceEdgeCases": true,
        "addTechnicalDepth": true
      }
    },
    "difficultyDecrease": {
      "conditions": {
        "consecutiveLowScores": 2,
        "averageScore": 65
      },
      "adjustments": {
        "simplifyChallenge": true,
        "provideHints": true,
        "reduceTechnicalDepth": true
      }
    }
  },
  "resources": {
    "productDocs": [
      {
        "title": "Glean Healthcare Solutions",
        "url": "https://docs.glean.com/solutions/healthcare"
      },
      {
        "title": "Security and Compliance Overview",
        "url": "https://docs.glean.com/security/compliance"
      }
    ]
  }
};

// Check if we can get a session token to verify credentials are working
console.log("Verifying AWS credentials...");
const sts = new AWS.STS();
sts.getCallerIdentity({}, (err, data) => {
  if (err) {
    console.error("❌ AWS credential verification failed:", err.message);
    console.log("Troubleshooting tips:");
    console.log("- Make sure your AWS profile exists and is properly configured");
    console.log("- For SSO profiles, make sure you've run 'aws sso login' before running this script");
    console.log("- Try running 'aws sts get-caller-identity' to verify credentials are working");
    console.log("- Check that your ~/.aws/config and ~/.aws/credentials files are correctly formatted");
    process.exit(1);
  } else {
    console.log(`✓ Successfully authenticated as: ${data.Arn}`);
    // Continue with the script execution after verified credentials
    seedDatabaseWithVerifiedCredentials();
  }
});

// Function to seed the database with verified credentials
async function seedDatabaseWithVerifiedCredentials() {
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
  
  console.log('Starting to seed DynamoDB table with scenarios...');
  const tableName = process.env.SCENARIO_TABLE_NAME || 'ScenarioTable';
  
  try {
    // Insert the sample scenario
    console.log(`Adding scenario: ${sampleScenario.title}`);
    await dynamoDB.put({
      TableName: tableName,
      Item: sampleScenario,
      ConditionExpression: 'attribute_not_exists(scenarioId)',
    }).promise().catch(e => {
      if (e.code === 'ConditionalCheckFailedException') {
        console.log(`Scenario ${sampleScenario.scenarioId} already exists, skipping`);
      } else {
        throw e;
      }
    });
    
    // Insert the additional scenario
    console.log(`Adding scenario: ${additionalScenario.title}`);
    await dynamoDB.put({
      TableName: tableName,
      Item: additionalScenario,
      ConditionExpression: 'attribute_not_exists(scenarioId)',
    }).promise().catch(e => {
      if (e.code === 'ConditionalCheckFailedException') {
        console.log(`Scenario ${additionalScenario.scenarioId} already exists, skipping`);
      } else {
        throw e;
      }
    });
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Export the function for other modules to use
module.exports = { seedDatabase: async () => {
  // When called as a module, we still need to verify the credentials
  try {
    const data = await sts.getCallerIdentity().promise();
    console.log(`✓ Successfully authenticated as: ${data.Arn}`);
    return seedDatabaseWithVerifiedCredentials();
  } catch (err) {
    console.error("❌ AWS credential verification failed:", err.message);
    throw err;
  }
}};
