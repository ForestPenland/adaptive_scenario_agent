import React from 'react';
import { createChatBotMessage } from 'react-chatbot-kit';
import Loader from './Loader';
import { BsChatSquareTextFill } from 'react-icons/bs';

// Custom avatar component
const BotAvatar = () => {
  return (
    <div className="avatar-container">
      <BsChatSquareTextFill color="white" size="16" />
    </div>
  );
};

// Custom bot message component with better formatting
const CustomBotMessage = (props) => {
  // Check if children is a string that looks like JSON
  const formatIfJson = (content) => {
    if (typeof content !== 'string') {
      return content;
    }
    
    try {
      // Check if string looks like JSON (starts with { or [)
      if ((content.trim().startsWith('{') || content.trim().startsWith('[')) && 
          (content.trim().endsWith('}') || content.trim().endsWith(']'))) {
        const parsedJson = JSON.parse(content);
        return (
          <pre>{JSON.stringify(parsedJson, null, 2)}</pre>
        );
      }
      
      // Handle markdown-like formatting for better readability
      let formattedContent = content;
      
      // Convert double line breaks to paragraphs
      formattedContent = formattedContent.split('\n\n').map((paragraph, index) => 
        <p key={index}>{paragraph}</p>
      );
      
      return formattedContent;
    } catch (e) {
      // Not valid JSON, return as is
      return content;
    }
  };

  return (
    <div className="custom-bot-message">
      {formatIfJson(props.children)}
    </div>
  );
};

const config = {
  initialMessages: [
    createChatBotMessage('Hello! How can I help you today?'),
  ],
  botName: 'Assistant',
  customStyles: {
    botMessageBox: {
      backgroundColor: '#e9ecef',
    },
    chatButton: {
      backgroundColor: '#0d6efd',
    },
  },
  widgets: [
    {
      widgetName: 'loader',
      widgetFunc: (props) => <Loader {...props} />,
    }
  ],
  customComponents: {
    // Custom avatar to replace the default one
    botAvatar: (props) => <BotAvatar {...props} />,
    // Use a custom message renderer to better handle different response formats
    botMessageBox: (props) => <CustomBotMessage {...props} />,
  },
  // Increase this value if messages are getting cut off
  customMessageDelay: 500,
};

export default config;
