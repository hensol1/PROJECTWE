import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import config from './config';

function App() {
  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <div className="App min-h-screen bg-gray-100">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">We Know Better</h1>
          <AuthComponent />
        </header>
        <main className="container mx-auto mt-8">
          <Matches />
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;