// Lambda Function: Response Evaluator using Amazon Bedrock

const AWS = require('aws-sdk');
const bedrock = new AWS.BedrockRuntime();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    const { learnerId, scenarioId, response } = requestBody;
    
    if (!learnerId || !scenarioId || !response) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameters' }),
      };
    }
    
    // 1. Get the scenario from DynamoDB
    const scenarioParams = {
      TableName: process.env.SCENARIO_TABLE_NAME,
      Key: { scenarioId },
    };
    
    const scenarioResult = await dynamoDB.get(scenarioParams).promise();
    const scenario = scenarioResult.Item;
    
    if (!scenario) {
      return {
        statusCode: 404,
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
    
    const progressResult = await dynamoDB.get(progressParams).promise();
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
    
    // Call Bedrock with Claude model
    const bedrockParams = {
      modelId: process.env.BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens_to_sample: 4000,
        temperature: 0.1,
        top_p: 0.9,
      }),
    };
    
    const bedrockResponse = await bedrock.invokeModel(bedrockParams).promise();
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const evaluationResult = JSON.parse(responseBody.completion);
    
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
    
    await dynamoDB.put(updateParams).promise();
    
    // 6. Return the evaluation results and next stage info
    let nextStage = null;
    if (!updatedProgress.completed) {
      nextStage = scenario.stages[updatedProgress.currentStage];
    }
    
    return {
      statusCode: 200,
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
      body: JSON.stringify({
        message: 'Error processing the response',
        error: error.message,
      }),
    };
  }
};
