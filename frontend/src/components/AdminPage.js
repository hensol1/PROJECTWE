import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import ContactAdmin from './ContactAdmin';

// Admin action button component
const AdminButton = ({ onClick, isLoading, label, loadingLabel }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-gray-400 transition duration-200 min-w-[160px]"
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
};

const AdminControls = ({ selectedDate, onRefreshMatches }) => {  
  const [isFetching, setIsFetching] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isResetting, setIsResetting] = useState({
    all: false,
    ai: false,
    fans: false
  });
  const [lastAction, setLastAction] = useState(null);

  const handleFetchMatches = async () => {
    try {
      setIsFetching(true);
      console.log('Triggering fetch for date:', selectedDate); // Debug log
      
      const response = await api.triggerFetchMatches(selectedDate);
      if (response.data.success) {
        console.log('Fetch matches result:', response.data);
        
        // Refresh the matches display after fetching
        await onRefreshMatches(selectedDate, true);
  
        setLastAction({ 
          type: 'success', 
          message: `Matches fetched successfully! Found ${response.data.stats?.filtered || 0} matches.`
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch matches');
      }
    } catch (error) {
      console.error('Fetch matches error:', error);
      setLastAction({ 
        type: 'error', 
        message: 'Error fetching matches: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsFetching(false);
    }
  };
  
      
  const handleRecalculateStats = async () => {
    try {
      setIsRecalculating(true);
      const response = await api.recalculateStats();
      console.log('Recalculation result:', response.data);
      setLastAction({ 
        type: 'success', 
        message: `Stats recalculated successfully. AI: ${response.data.stats.ai.accuracy}, Fans: ${response.data.stats.fans.accuracy}`
      });
    } catch (error) {
      console.error('Recalculation error:', error);
      setLastAction({ 
        type: 'error', 
        message: 'Error recalculating stats: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResetStats = async (type) => {
    const messages = {
      all: 'all prediction stats',
      ai: 'AI prediction stats',
      fans: 'fan prediction stats'
    };

    if (!window.confirm(`Are you sure you want to reset ${messages[type]}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsResetting(prev => ({ ...prev, [type]: true }));
      
      switch(type) {
        case 'all':
          await api.resetAllStats();
          break;
        case 'ai':
          await api.resetAIStats();
          break;
        case 'fans':
          await api.resetFanStats();
          break;
        default:
          throw new Error('Invalid reset type');
      }

      setLastAction({ 
        type: 'success', 
        message: `${messages[type]} reset successfully. Please recalculate stats to get new values.`
      });
      
      // Automatically trigger recalculation after reset
      await handleRecalculateStats();
    } catch (error) {
      console.error('Reset error:', error);
      setLastAction({ 
        type: 'error', 
        message: `Error resetting ${messages[type]}: ` + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsResetting(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Admin Controls</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        <AdminButton
          onClick={handleFetchMatches}
          isLoading={isFetching}
          label="Fetch Matches"
          loadingLabel="Fetching..."
        />
        <AdminButton
          onClick={handleRecalculateStats}
          isLoading={isRecalculating}
          label="Recalculate Stats"
          loadingLabel="Recalculating..."
        />
      </div>
      
      {/* Reset buttons section */}
      <div className="flex flex-wrap gap-4 mb-4 border-t pt-4">
        <AdminButton
          onClick={() => handleResetStats('ai')}
          isLoading={isResetting.ai}
          label="Reset AI Stats"
          loadingLabel="Resetting AI..."
          className="bg-orange-500 hover:bg-orange-600"
        />
        <AdminButton
          onClick={() => handleResetStats('fans')}
          isLoading={isResetting.fans}
          label="Reset Fan Stats"
          loadingLabel="Resetting Fans..."
          className="bg-purple-500 hover:bg-purple-600"
        />
        <AdminButton
          onClick={() => handleResetStats('all')}
          isLoading={isResetting.all}
          label="Reset All Stats"
          loadingLabel="Resetting All..."
          className="bg-red-500 hover:bg-red-600"
        />
      </div>

      {lastAction && (
        <div className={`mt-2 p-2 rounded ${
          lastAction.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {lastAction.message}
        </div>
      )}
    </div>
  );
};

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${
      type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {message}
    </div>
  );
};

const MatchCard = ({ match, onPrediction }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'LIVE': return 'text-red-500';
      case 'FINISHED': return 'text-gray-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center flex-1">
          <img 
            src={match.homeTeam.crest} 
            alt={match.homeTeam.name}
            className="w-8 h-8 object-contain mr-2"
          />
          <span className="text-sm md:text-base">{match.homeTeam.name}</span>
        </div>
        <span className={`px-3 text-xs font-semibold ${getStatusClass(match.status)}`}>
          {match.status === 'LIVE' ? 'LIVE' : 
           match.status === 'FINISHED' ? 
             `${match.score.fullTime.home} - ${match.score.fullTime.away}` : 
             format(new Date(match.utcDate), 'HH:mm')}
        </span>
        <div className="flex items-center flex-1 justify-end">
          <span className="text-sm md:text-base mr-2">{match.awayTeam.name}</span>
          <img 
            src={match.awayTeam.crest} 
            alt={match.awayTeam.name}
            className="w-8 h-8 object-contain"
          />
        </div>
      </div>
      <div className="flex justify-center space-x-2">
        <button
          onClick={() => onPrediction(match.id, 'HOME_TEAM')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition duration-200"
        >
          Home
        </button>
        <button
          onClick={() => onPrediction(match.id, 'DRAW')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition duration-200"
        >
          Draw
        </button>
        <button
          onClick={() => onPrediction(match.id, 'AWAY_TEAM')}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition duration-200"
        >
          Away
        </button>
      </div>
      {match.aiPrediction && (
        <div className="mt-2 text-sm text-center text-gray-600">
          Current AI Prediction: {match.aiPrediction}
        </div>
      )}
    </div>
  );
};

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('matches'); 
  const [matches, setMatches] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

  const fetchMatches = async (date, preserveScroll = false) => {
    try {
      setIsLoading(true);
      
      // Store current scroll position if preserveScroll is true
      if (preserveScroll) {
        scrollPositionRef.current = window.scrollY;
      }

      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await api.fetchMatches(formattedDate);
      
      // Filter matches to only include those from the selected date
      const filteredMatches = response.data.matches.filter(match => 
        isSameDay(parseISO(match.utcDate), date)
      );

      // Group filtered matches by competition
      const groupedMatches = filteredMatches.reduce((acc, match) => {
        if (!acc[match.competition.name]) {
          acc[match.competition.name] = [];
        }
        acc[match.competition.name].push(match);
        return acc;
      }, {});

      setMatches(groupedMatches);

      // Restore scroll position after state update if preserveScroll is true
      if (preserveScroll) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPositionRef.current);
        });
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch matches. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (days) => {
    setCurrentDate(prevDate => days > 0 ? addDays(prevDate, days) : subDays(prevDate, Math.abs(days)));
  };

  const handlePrediction = async (matchId, prediction) => {
    try {
      console.log('Attempting to make prediction:', { matchId, prediction });
      const response = await api.makeAIPrediction(matchId, prediction);
      console.log('Prediction response:', response.data);
      setNotification({
        type: 'success',
        message: 'AI prediction recorded'
      });
      
      // Fetch matches with scroll position preservation
      await fetchMatches(currentDate, true);
    } catch (error) {
      console.error('Error making AI prediction:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to record AI prediction'
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Add this tab navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 rounded-lg transition duration-200 ${
            activeTab === 'matches' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Match Management
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-lg transition duration-200 ${
            activeTab === 'contacts' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Contact Messages
        </button>
      </div>
  
      {/* Conditional rendering based on active tab */}
      {activeTab === 'matches' ? (
  <>
    <AdminControls 
      selectedDate={currentDate} 
      onRefreshMatches={fetchMatches} // Move this inside AdminControls
    />
        
      {/* Date Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => handleDateChange(-1)} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200"
          disabled={isLoading}
        >
          Previous Day
        </button>
        <h2 className="text-2xl font-bold text-gray-800">{format(currentDate, 'dd MMM yyyy')}</h2>
        <button 
          onClick={() => handleDateChange(1)} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200"
          disabled={isLoading}
        >
          Next Day
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* No Matches Message */}
      {!isLoading && Object.keys(matches).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No matches scheduled for this date
        </div>
      )}

      {/* Matches Display */}
      {!isLoading && Object.entries(matches).map(([competition, competitionMatches]) => (
        <div key={competition} className="mb-4">
          <h2 className="text-xl font-semibold mb-2">{competition}</h2>
          {competitionMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              onPrediction={handlePrediction}
            />
          ))}
        </div>
      ))}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      </>
    ) : (
      <ContactAdmin />
    )}
  </div>
);
}

export default AdminPage;
