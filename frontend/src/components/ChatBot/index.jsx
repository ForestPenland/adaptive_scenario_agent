import Chatbot from 'react-chatbot-kit';
import { useEffect, useState } from "react";
import { Button } from 'react-bootstrap';
import { BsFillChatFill } from "react-icons/bs";
import './css_overrides.css';
import config from './config';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import { v4 as uuid } from 'uuid';

const createSession = () => {
    const newUuid = uuid();
    localStorage.setItem('sessionid', newUuid);
    console.log('SESSIONID: ', localStorage.getItem('sessionid'));
};

const ChatBotComponent = () => {
    // state variable to track modal visibility
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        createSession();
    }, []);

    return (
        <div style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1000
        }}>
            {visible ?
                <div style={{ position: "relative" }}>
                    <Chatbot
                        config={config}
                        messageParser={MessageParser}
                        actionProvider={ActionProvider}
                        headerText='Chatbot Assistant'
                        placeholderText='Ask me anything...'
                    />
                    <button 
                        style={{
                            position: "absolute", 
                            top: '-15px', 
                            right: '-8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer'
                        }} 
                        onClick={() => setVisible(false)}
                    >
                        X
                    </button>
                </div>
                :
                <Button variant="primary" size="lg" onClick={() => setVisible(true)}>
                    <BsFillChatFill size={25} color="white" />
                </Button>
            }
        </div>
    );
};

export default ChatBotComponent;
