import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import UserProfile from './components/UserProfile';
import config from './config';

function App() {
  const [user, setUser] = useState(null);

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <Router>
        <div className="bg-gray-100 min-h-screen">
          <header className="bg-white shadow-sm py-2 px-4 flex justify-between items-center">
            <h1 className="text-lg font-bold text-gray-800">We Know Better</h1>
            <nav>
              <Link to="/" className="mr-4">Home</Link>
              {user && <Link to="/profile">Profile</Link>}
            </nav>
            <AuthComponent setUser={setUser} />
          </header>
          <main className="p-4">
            <Switch>
              <Route exact path="/">
                <Matches user={user} />
              </Route>
              <Route path="/profile">
                <UserProfile />
              </Route>
            </Switch>
          </main>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;