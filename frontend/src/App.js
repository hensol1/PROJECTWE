import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import UserProfile from './components/UserProfile';
import config from './config';

function App() {
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <div className="bg-gray-100 min-h-screen flex flex-col">
        <header className="bg-white shadow-sm py-2 px-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-lg font-bold text-gray-800">We Know Better</h1>
            <nav className="flex items-center">
              <button onClick={() => setShowProfile(false)} className="mr-4 text-blue-500 hover:text-blue-700">Home</button>
              {user && (
                <button onClick={() => setShowProfile(true)} className="mr-4 text-blue-500 hover:text-blue-700">Profile</button>
              )}
              <AuthComponent setUser={setUser} />
            </nav>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4">
          {showProfile ? <UserProfile /> : <Matches user={user} />}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;