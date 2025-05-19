// Lambda function to handle Bedrock agent communication
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require("@aws-sdk/client-bedrock-agent-runtime");
const client = new BedrockAgentRuntimeClient();

const { BEDROCK_AGENT_ID, AGENT_ALIAS } = process.env;

const buildResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    },
    body: JSON.stringify(body)
  };
};

const handleUserMessage = async (body, session) => {
  console.log('USER MESSAGE:', body);

  const input = {
    agentId: BEDROCK_AGENT_ID,
    agentAliasId: AGENT_ALIAS,
    sessionId: session,
    inputText: body
  };

  try {
    const response = await invokeAgent(input);
    console.log('BOT RESPONSE:', response);
    
    return {
      bot: response.completion
    };
  } catch (err) {
    console.error('Error invoking Bedrock agent:', err);
    return { error: err.message };
  }
};

const invokeAgent = async (input) => {
  try {
    const command = new InvokeAgentCommand(input);
    const response = await client.send(command);
    let completion = "";

    for await (const { chunk } of response.completion) {
      if (chunk) {
        const decoded = new TextDecoder("utf-8").decode(chunk.bytes);
        completion += decoded;
      }
    }

    return { response, completion };
  } catch (err) {
    console.error('Error in invokeAgent:', err);
    throw err;
  }
};

exports.handler = async (event) => {
  try {
    console.log('EVENT:', JSON.stringify(event));
    
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return buildResponse(200, {});
    }
    
    if (event.resource === '/message' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const queryParams = event.queryStringParameters || {};
      const session = queryParams.session || 'default-session';
      
      const result = await handleUserMessage(body, session);
      return buildResponse(200, result);
    }
    
    return buildResponse(404, { message: 'Not Found' });
  } catch (err) {
    console.error('Error in handler:', err);
    return buildResponse(500, { error: err.message });
  }
};
