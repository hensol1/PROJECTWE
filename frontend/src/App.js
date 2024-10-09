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
      <div className="bg-gray-100 min-h-screen">
        <header className="bg-white shadow-sm py-2 px-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800">We Know Better</h1>
          <nav>
            <button onClick={() => setShowProfile(false)} className="mr-4">Home</button>
            {user && (
              <button onClick={() => setShowProfile(true)}>Profile</button>
            )}
          </nav>
          <AuthComponent setUser={setUser} />
        </header>
        <main className="p-4">
          {showProfile ? <UserProfile /> : <Matches user={user} />}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;