import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import config from './config';

function App() {
  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <div className="App">
        <h1>We Know Better</h1>
        <AuthComponent />
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;