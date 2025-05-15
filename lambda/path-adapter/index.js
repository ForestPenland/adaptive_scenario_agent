// Lambda Function: Path Adapter for Glean Technical Enablement

// Import DynamoDB from AWS SDK v3
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize the DynamoDB client
const dynamoDB = new DynamoDB({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoDB);

exports.handler = async (event) => {
  try {
    // Extract request details including user info from Cognito
    const queryParams = event.queryStringParameters || {};
    const scenarioId = queryParams.scenarioId;
    
    // Get the cognito identity from the event
    const cognitoIdentity = event.requestContext?.authorizer?.claims;
    
    if (!cognitoIdentity || !cognitoIdentity.sub) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Unauthorized request'
        }),
      };
    }
    
    const learnerId = cognitoIdentity.sub;
    const role = cognitoIdentity['custom:role'] || 'SE';
    const experience = cognitoIdentity['custom:experience'] || 'Intermediate';
    
    // If scenario ID is provided, return learner progress for that scenario
    if (scenarioId) {
      const progressParams = {
        TableName: process.env.LEARNER_PROGRESS_TABLE_NAME,
        Key: {
          learnerId,
          scenarioId,
        }
      };
      
      const progressCommand = new GetCommand(progressParams);
      const progressResult = await docClient.send(progressCommand);
      
      // If no progress exists, return initial state
      if (!progressResult.Item) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            progress: {
              learnerId,
              scenarioId,
              currentStage: 0,
              completedStages: [],
              skills: {},
              startTime: new Date().toISOString(),
            }
          }),
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          progress: progressResult.Item,
        }),
      };
    }
    
    // If no scenario ID is provided, recommend personalized scenarios
    // based on the learner's role, experience, and past performance
    
    // 1. Get all learner's progress entries
    const learnerParams = {
      TableName: process.env.LEARNER_PROGRESS_TABLE_NAME,
      KeyConditionExpression: 'learnerId = :learnerId',
      ExpressionAttributeValues: {
        ':learnerId': learnerId,
      },
    };
    
    const learnerCommand = new QueryCommand(learnerParams);
    const learnerResult = await docClient.send(learnerCommand);
    const completedScenarios = learnerResult.Items.filter(item => item.completed).map(item => item.scenarioId);
    
    // 2. Get all available scenarios
    const scenarioParams = {
      TableName: process.env.SCENARIO_TABLE_NAME,
    };
    
    const scenarioCommand = new ScanCommand(scenarioParams);
    const scenarioResult = await docClient.send(scenarioCommand);
    
    // 3. Filter and rank scenarios based on learner attributes
    const recommendedScenarios = scenarioResult.Items
      // Filter out completed scenarios
      .filter(scenario => !completedScenarios.includes(scenario.scenarioId))
      // Filter by role if available
      .filter(scenario => {
        if (!scenario.targetRoles || scenario.targetRoles.length === 0) return true;
        return scenario.targetRoles.includes(role);
      })
      // Calculate a relevance score
      .map(scenario => {
        let relevanceScore = 0;
        
        // Higher score for matching role
        if (scenario.targetRoles && scenario.targetRoles.includes(role)) {
          relevanceScore += 30;
        }
        
        // Match difficulty to experience
        if (scenario.difficulty === 'beginner' && experience === 'Beginner') relevanceScore += 20;
        if (scenario.difficulty === 'intermediate' && experience === 'Intermediate') relevanceScore += 20;
        if (scenario.difficulty === 'advanced' && experience === 'Advanced') relevanceScore += 20;
        
        // Adjust for sequential learning
        const prerequisiteCompleted = !scenario.prerequisites || 
          scenario.prerequisites.every(prereq => completedScenarios.includes(prereq));
        
        if (prerequisiteCompleted) {
          relevanceScore += 25;
        } else {
          relevanceScore -= 50; // Strongly discourage scenarios where prerequisites aren't met
        }
        
        return {
          ...scenario,
          relevanceScore,
        };
      })
      // Sort by relevance score (highest first)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      // Limit to top 5 recommendations
      .slice(0, 5);
    
    // 4. Calculate learner's skill profile
    const skillProfile = {};
    
    learnerResult.Items.forEach(progress => {
      if (progress.skills) {
        Object.entries(progress.skills).forEach(([skill, data]) => {
          if (!skillProfile[skill]) {
            skillProfile[skill] = { level: 0, assessmentCount: 0 };
          }
          
          skillProfile[skill].level = ((skillProfile[skill].level * skillProfile[skill].assessmentCount) + 
                                      (data.level * data.assessments.length)) / 
                                      (skillProfile[skill].assessmentCount + data.assessments.length);
          
          skillProfile[skill].assessmentCount += data.assessments.length;
        });
      }
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        learnerId,
        role,
        experience,
        completedScenarios,
        skillProfile,
        recommendedScenarios,
      }),
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error processing the request',
        error: error.message,
      }),
    };
  }
};
