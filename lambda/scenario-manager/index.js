// Lambda Function: Scenario Manager for Glean Technical Enablement

// Import DynamoDB from AWS SDK v3
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize the DynamoDB client
const dynamoDB = new DynamoDB({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoDB);

exports.handler = async (event) => {
  try {
    // Extract request details
    const httpMethod = event.httpMethod;
    const path = event.path;
    const scenarioId = event.pathParameters?.scenarioId;
    
    // Get all scenarios
    if (httpMethod === 'GET' && !scenarioId) {
      const params = {
        TableName: process.env.SCENARIO_TABLE_NAME
      };
      
      const command = new ScanCommand(params);
      const result = await docClient.send(command);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          scenarios: result.Items 
        }),
      };
    }
    
    // Get a specific scenario
    if (httpMethod === 'GET' && scenarioId) {
      const params = {
        TableName: process.env.SCENARIO_TABLE_NAME,
        Key: { scenarioId },
      };
      
      const command = new GetCommand(params);
      const result = await docClient.send(command);
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            message: 'Scenario not found' 
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
          scenario: result.Item 
        }),
      };
    }
    
    // Create a new scenario
    if (httpMethod === 'POST') {
      const scenario = JSON.parse(event.body);
      
      // Validate required fields
      if (!scenario.scenarioId || !scenario.title || !scenario.description || !scenario.stages) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            message: 'Missing required fields' 
          }),
        };
      }
      
      const params = {
        TableName: process.env.SCENARIO_TABLE_NAME,
        Item: scenario,
        ConditionExpression: 'attribute_not_exists(scenarioId)', // Prevent overwriting existing scenarios
      };
      
      try {
        const command = new PutCommand(params);
        await docClient.send(command);
      } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
          return {
            statusCode: 409,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              message: 'A scenario with this ID already exists' 
            }),
          };
        }
        throw error;
      }
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          message: 'Scenario created successfully',
          scenario 
        }),
      };
    }
    
    // Update an existing scenario
    if (httpMethod === 'PUT' && scenarioId) {
      const updates = JSON.parse(event.body);
      
      // Check if the scenario exists
      const checkParams = {
        TableName: process.env.SCENARIO_TABLE_NAME,
        Key: { scenarioId },
      };
      
      const checkCommand = new GetCommand(checkParams);
      const result = await docClient.send(checkCommand);
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            message: 'Scenario not found' 
          }),
        };
      }
      
      // Update the scenario
      const updateParams = {
        TableName: process.env.SCENARIO_TABLE_NAME,
        Item: {
          ...result.Item,
          ...updates,
          scenarioId, // Ensure ID remains unchanged
        },
      };
      
      const command = new PutCommand(updateParams);
      await docClient.send(command);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          message: 'Scenario updated successfully',
          scenario: updateParams.Item 
        }),
      };
    }
    
    // Delete a scenario
    if (httpMethod === 'DELETE' && scenarioId) {
      const params = {
        TableName: process.env.SCENARIO_TABLE_NAME,
        Key: { scenarioId },
        ReturnValues: 'ALL_OLD',
      };
      
      const command = new DeleteCommand(params);
      const result = await docClient.send(command);
      
      if (!result.Attributes) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            message: 'Scenario not found' 
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
          message: 'Scenario deleted successfully' 
        }),
      };
    }
    
    // Method not supported
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Method not allowed' 
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
