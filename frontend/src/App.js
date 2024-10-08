import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import config from './config';

function App() {
  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <div className="bg-gray-100">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">We Know Better</h1>
          <AuthComponent />
        </header>
        <main className="p-4 mt-16">
          <Matches />
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;