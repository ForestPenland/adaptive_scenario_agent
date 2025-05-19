import { createChatBotMessage } from 'react-chatbot-kit';
import Loader from './Loader';

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
};

export default config;
