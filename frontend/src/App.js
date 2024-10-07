import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import config from './config';

function App() {
  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <div className="App min-h-screen bg-gray-100">
        <header className="bg-white shadow-md p-4">
          <h1 className="text-2xl font-bold text-center">We Know Better</h1>
        </header>
        <main>
          <AuthComponent />
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;