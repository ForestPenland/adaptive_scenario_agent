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
      
      // Call the API Gateway endpoint
      const response = await API.post('api', `/message?session=${sessionId}`, {
        body: userMessage,
      });
      
      console.log('Bot response:', response);
      
      // Create bot message with the response
      const botMessage = createChatBotMessage(response.bot);
      
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
