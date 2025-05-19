import React from 'react';

const MessageParser = ({ children, actions }) => {
  const parse = (message) => {
    console.log('User message:', message);
    
    // Send all messages to the Bedrock agent
    actions.handleBotApi(message);
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          parse: parse,
          actions: {},
        });
      })}
    </div>
  );
};

export default MessageParser;
