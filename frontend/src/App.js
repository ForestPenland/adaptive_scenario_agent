import React from 'react';
import { Amplify } from 'aws-amplify';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import ScenarioSimulator from './components/ScenarioSimulator';

// Initialize Amplify - will be configured with real values after deployment
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'YOUR_USER_POOL_ID',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'YOUR_USER_POOL_CLIENT_ID',
  },
  API: {
    endpoints: [
      {
        name: 'enablementApi',
        endpoint: process.env.REACT_APP_API_ENDPOINT || 'YOUR_API_GATEWAY_URL',
        custom_header: async () => {
          try {
            const session = await Amplify.Auth.currentSession();
            return {
              Authorization: `Bearer ${session.getIdToken().getJwtToken()}`,
            };
          } catch (e) {
            // Handle error or return empty headers if not signed in
            return {};
          }
        },
      },
    ],
  },
});

function App() {
  return (
    <div className="App">
      <ScenarioSimulator />
    </div>
  );
}

export default App;
