import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import ContactAdmin from './ContactAdmin';
import AdminLoginForm from './AdminLoginForm';
import MatchDebugger from './MatchDebugger';
import { BlogEditor } from './blog/BlogEditor';
import { useLocation } from 'react-router-dom';



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
  const [isFetchingOdds, setIsFetchingOdds] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isResettingAI, setIsResettingAI] = useState(false);
  const [isFixingStats, setIsFixingStats] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const handleFetchMatches = async () => {
    try {
      setIsFetching(true);
      console.log('Triggering fetch for date:', selectedDate);
      
      const response = await api.triggerFetchMatches(selectedDate);
      if (response.data.success) {
        console.log('Fetch matches result:', response.data);
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

  const handleFetchOdds = async () => {
    try {
      setIsFetchingOdds(true);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await api.triggerFetchOdds(formattedDate);
      
      if (response.data.success) {
        setLastAction({ 
          type: 'success', 
          message: `Odds fetched successfully! Updated ${response.data.stats?.updated || 0} matches.`
        });
        await onRefreshMatches(selectedDate, true);
      } else {
        throw new Error(response.data.message || 'Failed to fetch odds');
      }
    } catch (error) {
      console.error('Fetch odds error:', error);
      setLastAction({ 
        type: 'error', 
        message: 'Error fetching odds: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsFetchingOdds(false);
    }
  };
      
  const handleRecalculateStats = async () => {
    try {
      setIsRecalculating(true);
      const response = await api.recalculateStats();
      console.log('Recalculation result:', response.data);
      setLastAction({ 
        type: 'success', 
        message: `Stats recalculated successfully. AI accuracy: ${response.data.aiStats.accuracy}%`
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

  const handleFixStats = async () => {
    if (!window.confirm('This will recalculate all daily stats with correct dates. Continue?')) {
      return;
    }

    try {
      setIsFixingStats(true);
      const response = await api.fixStats();
      
      console.log('Fix stats result:', response.data);
      setLastAction({ 
        type: 'success', 
        message: 'Daily stats fixed successfully! Please refresh the stats page to see changes.'
      });
    } catch (error) {
      console.error('Fix stats error:', error);
      setLastAction({ 
        type: 'error', 
        message: 'Error fixing stats: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsFixingStats(false);
    }
  };

  const handleResetAIStats = async () => {
    if (!window.confirm('Are you sure you want to reset AI prediction stats? This action cannot be undone.')) {
      return;
    }

    try {
      setIsResettingAI(true);
      await api.resetAIStats();

      setLastAction({ 
        type: 'success', 
        message: 'AI stats reset successfully. Please recalculate stats to get new values.'
      });
      
      await handleRecalculateStats();
    } catch (error) {
      console.error('Reset error:', error);
      setLastAction({ 
        type: 'error', 
        message: 'Error resetting AI stats: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsResettingAI(false);
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
          onClick={handleFetchOdds}
          isLoading={isFetchingOdds}
          label="Fetch Odds"
          loadingLabel="Fetching Odds..."
        />
        <AdminButton
          onClick={handleRecalculateStats}
          isLoading={isRecalculating}
          label="Recalculate Stats"
          loadingLabel="Recalculating..."
        />
        <AdminButton
          onClick={handleFixStats}
          isLoading={isFixingStats}
          label="Fix Daily Stats"
          loadingLabel="Fixing Stats..."
        />
      </div>
      
      <div className="flex flex-wrap gap-4 mb-4 border-t pt-4">
        <AdminButton
          onClick={handleResetAIStats}
          isLoading={isResettingAI}
          label="Reset AI Stats"
          loadingLabel="Resetting AI..."
          className="bg-orange-500 hover:bg-orange-600"
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

const AdminPage = ({ defaultTab }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || 'matches');
  
  // When defaultTab changes, update activeTab
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [matches, setMatches] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMatches(currentDate);
    }
  }, [currentDate, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'blog') {
      const fetchPosts = async () => {
        try {
          const response = await api.getBlogPosts();
          setPosts(response.data.posts);
        } catch (error) {
          console.error('Error fetching blog posts:', error);
          setNotification({
            type: 'error',
            message: 'Failed to fetch blog posts'
          });
        }
      };
      fetchPosts();
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    console.log('Location state:', location.state);
    console.log('Current active tab:', activeTab);
  }, [location.state, activeTab]);  

  const handleLoginSuccess = (token) => {
    setIsAuthenticated(true);
  };

  const fetchMatches = async (date, preserveScroll = false) => {
    try {
      setIsLoading(true);
      
      if (preserveScroll) {
        scrollPositionRef.current = window.scrollY;
      }

      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await api.fetchMatches(formattedDate);
      
      const filteredMatches = response.data.matches.filter(match => 
        isSameDay(parseISO(match.utcDate), date)
      );

      const groupedMatches = filteredMatches.reduce((acc, match) => {
        if (!acc[match.competition.name]) {
          acc[match.competition.name] = [];
        }
        acc[match.competition.name].push(match);
        return acc;
      }, {});

      setMatches(groupedMatches);

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
      const response = await api.makeAIPrediction(matchId, prediction);
      setNotification({
        type: 'success',
        message: 'AI prediction recorded'
      });
      await fetchMatches(currentDate, true);
    } catch (error) {
      console.error('Error making AI prediction:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to record AI prediction'
      });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await api.deleteBlogPost(postId);
      setPosts(posts.filter(post => post._id !== postId));
      setNotification({
        type: 'success',
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete post'
      });
    }
  };

  if (!isAuthenticated) {
    return <AdminLoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
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
        <button
          onClick={() => setActiveTab('blog')}
          className={`px-4 py-2 rounded-lg transition duration-200 ${
            activeTab === 'blog' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Blog Posts
        </button>
      </div>

      {activeTab === 'matches' ? (
        <>
          <AdminControls 
            selectedDate={currentDate} 
            onRefreshMatches={fetchMatches}
          />
          <MatchDebugger />
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

          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!isLoading && Object.keys(matches).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No matches scheduled for this date
            </div>
          )}

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
        </>
      ) : activeTab === 'contacts' ? (
        <ContactAdmin />
      ) : activeTab === 'blog' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Blog Posts</h2>
            <Link 
  to="/admin/blog/new"
  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition duration-200"
>
  Create New Post
</Link>
          </div>
          
          <div className="space-y-4">
  {posts.map(post => (
    <div key={post._id} className="bg-white shadow-md rounded-lg p-4">
      <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
      <p className="text-gray-600 mb-2">
        {new Date(post.publishDate).toLocaleDateString()}
      </p>
      <div className="flex space-x-2">
        <Link
          to={`/admin/blog/edit/${post._id}`}  // Make sure we're using _id here
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit
        </Link>
        <button
          onClick={() => handleDeletePost(post._id)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  ))}
</div>

        </div>
      ) : null}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;