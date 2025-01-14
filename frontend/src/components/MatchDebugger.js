import React, { useState } from 'react';
import api from '../api';
import { format } from 'date-fns';

const MatchDebugger = () => {
  const [debugLogs, setDebugLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    setDebugLogs(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const testFetch = async () => {
    setIsLoading(true);
    setDebugLogs([]);
    try {
      // Test 1: Check date formatting
      const testDate = new Date();
      const formattedDate = format(testDate, 'yyyy-MM-dd');
      addLog(`Test date formatted: ${formattedDate}`);

      // Test 2: Check API endpoint
      addLog(`Using API URL: ${api.defaults.baseURL}`);

      // Test 3: Trigger match fetch
      addLog('Attempting to fetch matches...');
      const response = await api.triggerFetchMatches(testDate);
      addLog(`Fetch response: ${JSON.stringify(response.data, null, 2)}`, 'success');

      // Test 4: Check matches in database
      const matchesResponse = await api.fetchMatches(formattedDate);
      const matches = matchesResponse.data.matches || [];
      addLog(`Found ${matches.length} matches in database`);
      
      if (matches.length > 0) {
        addLog('Sample match:', 'info');
        addLog(JSON.stringify(matches[0], null, 2));
      }

    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
      if (error.response) {
        addLog(`Response data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Match Fetching Debugger</h2>
        
        <button
          onClick={testFetch}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 mb-4"
        >
          {isLoading ? 'Testing...' : 'Run Debug Tests'}
        </button>

        <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-auto">
          {debugLogs.map((log, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded ${
                log.type === 'error' ? 'bg-red-100 text-red-800' :
                log.type === 'success' ? 'bg-green-100 text-green-800' :
                'bg-white'
              }`}
            >
              <span className="text-xs text-gray-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <pre className="whitespace-pre-wrap text-sm mt-1 font-mono">{log.message}</pre>
            </div>
          ))}
          {debugLogs.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No logs yet. Click "Run Debug Tests" to start debugging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchDebugger;