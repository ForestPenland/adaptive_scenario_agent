import React from 'react';
import { API } from 'aws-amplify';
import Loader from './Loader';

const ActionProvider = ({ createChatBotMessage, setState, children }) => {
  const handleBotApi = async (userMessage) => {
    // Show loading indicator
    const loadingMessage = createChatBotMessage(<Loader />);
    
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, loadingMessage],
    }));
    
    try {
      // Get session ID from localStorage or create a new one
      const sessionId = localStorage.getItem('sessionid') || 'default-session';
      
      // Call the API Gateway endpoint with properly formatted request body
      const response = await API.post('api', `/message?session=${sessionId}`, {
        body: userMessage,
      });
      
      console.log('Bot response type:', typeof response.bot);
      console.log('Bot response content:', response.bot);
      
      // Enhanced processing of bot responses with detailed logging
      let botContent;
      
      console.log('Response structure:', JSON.stringify(response, null, 2));
      
      if (typeof response.bot === 'string') {
        // String response - use directly
        botContent = response.bot;
        console.log('Using string response');
      } else if (response.bot && typeof response.bot === 'object') {
        // Object response - pretty format as JSON
        try {
          // See if the object has any meaningful text content first
          if (response.bot.text || response.bot.message || response.bot.content) {
            botContent = response.bot.text || response.bot.message || response.bot.content;
            console.log('Extracted text content from object');
          } else if (response.bot.completion) {
            botContent = response.bot.completion;
            console.log('Using completion property from response');
          } else {
            // Convert the entire object to readable format
            botContent = JSON.stringify(response.bot, null, 2);
            console.log('Converted object to formatted JSON string');
          }
        } catch (err) {
          console.error('Error processing response object:', err);
          botContent = "There was an issue formatting the response.";
        }
      } else if (response && response.completion) {
        // Direct completion property at the top level
        botContent = response.completion;
        console.log('Using top-level completion property');
      } else {
        // Fallback for undefined or null responses
        console.warn('Response is missing expected structure:', response);
        botContent = "I received your message but couldn't generate a proper response. Please try again.";
      }
      
      // Create bot message with the processed response
      const botMessage = createChatBotMessage(botContent);
      
      // Update state, removing the loading message
      setState((prev) => {
        const newMessages = prev.messages.slice(0, -1); // Remove loading message
        return {
          ...prev,
          messages: [...newMessages, botMessage],
        };
      });
    } catch (error) {
      console.error('Error calling bot API:', error);
      
      // Show error message
      const errorMessage = createChatBotMessage('Sorry, I encountered an error. Please try again later.');
      
      setState((prev) => {
        const newMessages = prev.messages.slice(0, -1); // Remove loading message
        return {
          ...prev,
          messages: [...newMessages, errorMessage],
        };
      });
    }
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          actions: {
            handleBotApi,
          },
        });
      })}
    </div>
  );
};

export default ActionProvider;
