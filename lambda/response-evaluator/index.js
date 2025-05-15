// Lambda Function: Response Evaluator using Amazon Bedrock

// Import AWS SDK v3 modules
const { BedrockRuntime } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize clients
const bedrockClient = new BedrockRuntime({ region: 'us-east-1' });
const dynamoDB = new DynamoDB({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoDB);

exports.handler = async (event) => {
  // Handle OPTIONS requests for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    const { learnerId, scenarioId, response } = requestBody;
    
    if (!learnerId || !scenarioId || !response) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Missing required parameters' }),
      };
    }
    
    // 1. Get the scenario from DynamoDB
    const scenarioParams = {
      TableName: process.env.SCENARIO_TABLE_NAME,
      Key: { scenarioId },
    };
    
    const scenarioCommand = new GetCommand(scenarioParams);
    const scenarioResult = await docClient.send(scenarioCommand);
    const scenario = scenarioResult.Item;
    
    if (!scenario) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Scenario not found' }),
      };
    }
    
    // 2. Get the learner's current progress
    const progressParams = {
      TableName: process.env.LEARNER_PROGRESS_TABLE_NAME,
      Key: { 
        learnerId,
        scenarioId,
      },
    };
    
    const progressCommand = new GetCommand(progressParams);
    const progressResult = await docClient.send(progressCommand);
    let learnerProgress = progressResult.Item || {
      learnerId,
      scenarioId,
      currentStage: 0,
      skills: {},
      completedStages: [],
      startTime: new Date().toISOString(),
    };
    
    // 3. Use Bedrock to evaluate the response
    const currentStage = scenario.stages[learnerProgress.currentStage];
    
    // Prepare prompt for Bedrock
    const prompt = `
You are an AI technical enablement agent helping evaluate responses from GTM team members learning about Glean AI Agents technology.

SCENARIO CONTEXT:
${scenario.description}

CURRENT STAGE:
${currentStage.description}

CUSTOMER QUESTION/CHALLENGE:
${currentStage.challenge}

EXPECTED RESPONSE ELEMENTS:
${currentStage.expectedElements.join('\n')}

KEY TECHNICAL POINTS TO INCLUDE:
${currentStage.technicalPoints.join('\n')}

COMMON MISTAKES:
${currentStage.commonMistakes.join('\n')}

LEARNER RESPONSE:
${response}

Please evaluate the learner's response and provide:
1. An overall score from 0-100
2. Technical accuracy score from 0-100
3. Communication effectiveness score from 0-100
4. Specific strengths (list up to 3)
5. Areas for improvement (list up to 3)
6. Tailored feedback based on the response
7. Suggested learning focus for next stages
8. A recommendation for scenario difficulty adjustment (easier, same, harder)

Format your response as a valid JSON object with these fields:
{
  "overallScore": number,
  "technicalAccuracy": number,
  "communicationEffectiveness": number,
  "strengths": string[],
  "improvementAreas": string[],
  "feedback": string,
  "learningFocus": string,
  "difficultyAdjustment": string
}
    `;
    
    // Call Bedrock with Claude model, using the appropriate format based on the model
    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-v2';
    console.log(`Using Bedrock model: ${modelId}`);
    
    let bedrockParams;
    let evaluationResult;
    
    try {
      if (modelId.startsWith('anthropic.claude-3')) {
        // Claude 3 format (messages API)
        bedrockParams = {
          modelId: modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4000,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt
                  }
                ]
              }
            ],
            temperature: 0.1,
            top_p: 0.9,
          }),
        };
        
        console.log('Calling Bedrock with Claude 3 params');
        const bedrockResponse = await bedrockClient.invokeModel(bedrockParams);
        const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        console.log('Bedrock response received:', responseBody);
        
        // Extract JSON from the response content
        const responseText = responseBody.content[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          evaluationResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract JSON from Claude response');
        }
      } else if (modelId.startsWith('anthropic.claude-')) {
        // Claude 1/2 format
        const formattedPrompt = `\n\nHuman: ${prompt}\n\nAssistant:`;
        bedrockParams = {
          modelId: modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            prompt: formattedPrompt,
            max_tokens_to_sample: 4000,
            temperature: 0.1,
            top_p: 0.9,
          }),
        };
        
        console.log('Calling Bedrock with Claude 1/2 params');
        const bedrockResponse = await bedrockClient.invokeModel(bedrockParams);
        const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        console.log('Bedrock raw response:', responseBody);
        
        if (responseBody.completion) {
          try {
            evaluationResult = JSON.parse(responseBody.completion);
          } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            // Try to extract JSON from the completion text
            const jsonMatch = responseBody.completion.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              evaluationResult = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Could not extract valid JSON from response');
            }
          }
        } else {
          throw new Error('Unexpected response format from Bedrock');
        }
      } else {
        throw new Error(`Unsupported model: ${modelId}`);
      }
      
      console.log('Parsed evaluation result:', evaluationResult);
    } catch (bedrockError) {
      console.error('Bedrock invocation error:', bedrockError);
      throw bedrockError;
    }
    
    // 4. Update the learner's progress
    const newSkills = { ...learnerProgress.skills };
    
    // Update skills based on the scenario's skill tags
    currentStage.skillTags.forEach(skill => {
      if (!newSkills[skill]) {
        newSkills[skill] = {
          level: 0,
          assessments: [],
        };
      }
      
      newSkills[skill].assessments.push(evaluationResult.technicalAccuracy);
      
      // Update skill level (average of last 3 assessments)
      const recentAssessments = newSkills[skill].assessments.slice(-3);
      newSkills[skill].level = recentAssessments.reduce((sum, score) => sum + score, 0) / recentAssessments.length;
    });
    
    // Determine if learner should progress to next stage
    const passThreshold = currentStage.passThreshold || 70;
    const passed = evaluationResult.overallScore >= passThreshold;
    
    // Prepare updated progress record
    const updatedProgress = {
      ...learnerProgress,
      skills: newSkills,
      lastUpdated: new Date().toISOString(),
      evaluations: [...(learnerProgress.evaluations || []), {
        stage: learnerProgress.currentStage,
        timestamp: new Date().toISOString(),
        response: response,
        evaluation: evaluationResult,
      }],
    };
    
    // If passed, advance to next stage
    if (passed) {
      updatedProgress.completedStages = [...(learnerProgress.completedStages || []), learnerProgress.currentStage];
      
      // If more stages exist, advance to next stage
      if (learnerProgress.currentStage < scenario.stages.length - 1) {
        updatedProgress.currentStage = learnerProgress.currentStage + 1;
      } else {
        updatedProgress.completed = true;
        updatedProgress.completionTime = new Date().toISOString();
      }
    }
    
    // 5. Save updated progress to DynamoDB
    const updateParams = {
      TableName: process.env.LEARNER_PROGRESS_TABLE_NAME,
      Item: updatedProgress,
    };
    
    const updateCommand = new PutCommand(updateParams);
    await docClient.send(updateCommand);
    
    // 6. Return the evaluation results and next stage info
    let nextStage = null;
    if (!updatedProgress.completed) {
      nextStage = scenario.stages[updatedProgress.currentStage];
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        evaluation: evaluationResult,
        passed,
        completed: updatedProgress.completed || false,
        nextStage: nextStage ? {
          description: nextStage.description,
          challenge: nextStage.challenge,
        } : null,
      }),
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error processing the response',
        error: error.message,
      }),
    };
  }
};
