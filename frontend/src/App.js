import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import UserProfile from './components/UserProfile';
import AdminPage from './components/AdminPage';
import config from './config';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log('Current user state:', user);
  }, [user]);

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <Router>
        <div className="bg-gray-100 min-h-screen flex flex-col">
          <header className="bg-white shadow-sm py-2 px-4">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-lg font-bold text-gray-800">We Know Better</h1>
              <nav className="flex items-center">
                <Link to="/" className="mr-4 text-blue-500 hover:text-blue-700">Home</Link>
                {user && (
                  <>
                    <Link to="/profile" className="mr-4 text-blue-500 hover:text-blue-700">Profile</Link>
                    {user.isAdmin && (
                      <>
                        <Link to="/admin" className="mr-4 text-blue-500 hover:text-blue-700">Admin</Link>
                        {console.log('Admin link should be visible')}
                      </>
                    )}
                    {!user.isAdmin && console.log('User is not admin')}
                  </>
                )}
                {!user && console.log('No user logged in')}
                <AuthComponent setUser={setUser} />
              </nav>
            </div>
          </header>
          <main className="flex-grow container mx-auto p-4">
            <Routes>
              <Route path="/" element={<Matches user={user} />} />
              <Route path="/profile" element={<UserProfile user={user} />} />
              {user && user.isAdmin && (
                <Route path="/admin" element={<AdminPage />} />
              )}
            </Routes>
          </main>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;