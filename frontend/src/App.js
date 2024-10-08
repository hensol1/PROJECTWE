import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import config from './config';

function App() {
  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-2 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">We Know Better</h1>
            <AuthComponent />
          </div>
        </header>
        <main className="container mx-auto mt-4 px-4">
          <Matches />
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;