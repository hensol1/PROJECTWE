import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Function to handle the initial loading state
const handleInitialLoad = () => {
  // Wait for the DOM to be fully loaded
  const loader = document.getElementById('initial-loading');
  if (loader) {
    // Add a slight delay to ensure smooth transition
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.remove();
      }, 500);
    }, 1000); // Show spinner for at least 1 second
  }
};

// Create root and render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Handle the initial loading state after React renders
handleInitialLoad();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();