import Chatbot from 'react-chatbot-kit';
import { useEffect, useState } from "react";
import { Button } from 'react-bootstrap';
import { BsFillChatFill } from "react-icons/bs";
import './css_overrides.css';
import './custom_components.css'; // Import our custom styles
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
                <div style={{ 
                    position: "relative",
                    width: "350px",
                    height: "500px",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
                    borderRadius: "10px"
                }}>
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
                            right: '-15px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }} 
                        onClick={() => setVisible(false)}
                    >
                        X
                    </button>
                </div>
                :
                <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => setVisible(true)}
                    style={{
                        borderRadius: "50%",
                        width: "60px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)"
                    }}
                >
                    <BsFillChatFill size={25} color="white" />
                </Button>
            }
        </div>
    );
};

export default ChatBotComponent;
