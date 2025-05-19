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
  "scenarioId": "ai-agent-prompt-engineering",
  "title": "Enterprise AI Agent Prompt Engineering",
  "description": "A technology company with a large knowledge base spread across various documentation systems is implementing Glean AI Agents to improve employee productivity. They need expertise in designing effective prompts that produce consistent, high-quality responses.",
  "difficulty": "intermediate",
  "targetRoles": ["SE", "SA", "CSM"],
  "learningObjectives": [
    "Demonstrate understanding of prompt engineering principles",
    "Design structured prompts for enterprise knowledge retrieval",
    "Implement guardrails and consistency controls",
    "Develop testing frameworks for prompt quality assurance"
  ],
  "scenarioType": "technical workshop simulation",
  "stages": [
    {
      "stageId": "initial-assessment",
      "title": "Prompt Engineering Fundamentals",
      "description": "Workshop with the customer's IT and knowledge management teams to introduce prompt engineering concepts",
      "challenge": "The CTO asks: 'We've had mixed results with prompt engineering in the past. Some of our prompts produce inconsistent or vague responses. How can we ensure our Glean AI Agents provide precise, reliable answers that follow our company guidelines?'",
      "expectedElements": [
        "Distinguish Glean's approach from general-purpose AI",
        "Explain structured prompt components",
        "Address consistency and reliability concerns",
        "Introduce the concept of prompt guardrails"
      ],
      "technicalPoints": [
        "Glean's knowledge source constraints",
        "Context definition frameworks",
        "Response templating methods",
        "Confidence threshold configuration"
      ],
      "commonMistakes": [
        "Providing generic prompt advice not specific to Glean",
        "Not addressing enterprise-specific requirements",
        "Oversimplifying the prompt engineering process",
        "Failing to mention reliability measurement"
      ],
      "skillTags": ["prompt-design", "technical-communication", "knowledge-architecture"],
      "passThreshold": 75
    },
    {
      "stageId": "governance-implementation",
      "title": "Prompt Governance and Controls",
      "description": "Session focused on implementing guardrails and governance for enterprise prompt design",
      "challenge": "The Information Security Director states: 'Our company deals with sensitive customer information and proprietary data. How do we ensure AI Agents won't reveal confidential information or generate inappropriate responses?'",
      "expectedElements": [
        "Explain Glean's information access controls",
        "Detail prompt-level security constraints",
        "Address prohibited content handling",
        "Discuss audit capabilities for agent responses"
      ],
      "technicalPoints": [
        "Role-based prompt templates",
        "Prohibited topic configuration",
        "Confidence threshold implementation",
        "Attribute-based knowledge access"
      ],
      "commonMistakes": [
        "Not addressing data leakage concerns directly",
        "Providing vague assurances without technical specifics",
        "Overlooking governance processes for prompt management",
        "Missing the connection between access controls and prompts"
      ],
      "skillTags": ["security-governance", "compliance-knowledge", "prompt-design"],
      "passThreshold": 80
    },
    {
      "stageId": "advanced-techniques",
      "title": "Advanced Prompt Engineering Techniques",
      "description": "Technical deep dive on optimizing prompt performance for complex enterprise scenarios",
      "challenge": "The Knowledge Management Director explains: 'We have highly technical documents with specialized terminology across multiple departments. Regular AI systems struggle with this context. How can we create prompts that handle domain-specific knowledge effectively?'",
      "expectedElements": [
        "Demonstrate domain-specific prompt techniques",
        "Explain context window optimization",
        "Address terminology and semantic challenges",
        "Present testing frameworks for domain accuracy"
      ],
      "technicalPoints": [
        "Domain dictionary integration",
        "Hierarchical prompt structures",
        "Technical terminology handling",
        "Knowledge graph-enhanced prompting"
      ],
      "commonMistakes": [
        "Not addressing the complexity of technical domains",
        "Providing general solutions for specialized problems",
        "Underestimating the need for domain validation",
        "Missing opportunities for knowledge structure leveraging"
      ],
      "skillTags": ["advanced-prompting", "domain-expertise", "semantic-understanding"],
      "passThreshold": 85
    },
    {
      "stageId": "measurement-optimization",
      "title": "Prompt Measurement and Optimization",
      "description": "Workshop on establishing metrics and improvement processes for prompt quality",
      "challenge": "The VP of Engineering asks: 'How do we actually know if our prompts are working well? What metrics should we track, and what process should we use to continuously improve them?'",
      "expectedElements": [
        "Define key quality metrics for prompts",
        "Present A/B testing methodology",
        "Explain the prompt refinement lifecycle",
        "Discuss balancing precision vs. recall"
      ],
      "technicalPoints": [
        "Statistical evaluation frameworks",
        "User feedback integration systems",
        "Automated quality monitoring",
        "Performance dashboard configuration"
      ],
      "commonMistakes": [
        "Focusing only on subjective assessments",
        "Not establishing clear improvement processes",
        "Overlooking the need for targeted test cases",
        "Missing the connection between user experience and prompt metrics"
      ],
      "skillTags": ["performance-optimization", "data-analysis", "quality-assurance"],
      "passThreshold": 75
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
