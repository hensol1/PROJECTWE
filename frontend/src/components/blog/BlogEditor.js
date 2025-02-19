import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../../api';
import { LogoService } from '../../services/logoService';

const TeamLogo = ({ teamId, teamName }) => {
  const [imgSrc, setImgSrc] = useState('');
  
  useEffect(() => {
    const { localPath, apiPath } = LogoService.getTeamLogoPath(teamId);
    
    // Try to load local image first
    fetch(localPath)
      .then(response => {
        if (response.ok) {
          setImgSrc(localPath);
        } else {
          // If local image doesn't exist, use API URL
          setImgSrc(apiPath);
        }
      })
      .catch(() => {
        setImgSrc(apiPath);
      });
  }, [teamId]);

  return (
    <img
      src={imgSrc || '/fallback-team-logo.png'}
      alt={teamName}
      className="w-6 h-6 object-contain"
      onError={(e) => {
        e.target.src = '/fallback-team-logo.png';
      }}
    />
  );
};

const SelectorWithSearch = ({ items, onSelect, onClose, type }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Focus search input when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute z-50 mt-2 w-80 bg-gray-800 rounded-md shadow-lg">
      <div className="p-2 border-b border-gray-700">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${type}...`}
          className="w-full px-3 py-1.5 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="max-h-60 overflow-y-auto py-1">
        {filteredItems.length === 0 ? (
          <div className="px-4 py-2 text-gray-400 text-sm">
            No {type.toLowerCase()} found
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id, item.name);
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center space-x-2"
            >
              {type === 'Teams' ? (
                <TeamLogo teamId={item.id} teamName={item.name} />
              ) : (
                <img
                  src={`/logos/competitions/${item.id}.png`}
                  alt={item.name}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.target.src = '/fallback-competition-logo.png';
                  }}
                />
              )}
              <span>{item.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const TeamSelector = ({ onSelect, onClose }) => {
  const teams = [
    { id: "489", name: "AC Milan" },
    { id: "499", name: "Atalanta" },
    { id: "503", name: "Torino" },
    { id: "505", name: "Inter" },
    { id: "497", name: "AS Roma" },
    { id: "530", name: "Atletico Madrid" },
    { id: "529", name: "Barcelona" },
    { id: "532", name: "Valencia" },
    { id: "533", name: "Villarreal" },
    { id: "536", name: "Sevilla" },
    { id: "157", name: "Bayern Munich" },
    { id: "569", name: "Club Brugge KV" },
    { id: "211", name: "Benfica" },
    { id: "91", name: "Monaco" },
    { id: "165", name: "Borussia Dortmund" },
    { id: "85", name: "Paris Saint Germain" },
    { id: "106", name: "Stade Brestois 29" },
    { id: "197", name: "PSV Eindhoven" },
    { id: "496", name: "Juventus" },
    { id: "541", name: "Real Madrid" },
    { id: "50", name: "Manchester City" },
    { id: "40", name: "Liverpool" },
    { id: "66", name: "Aston Villa" },
    { id: "1357", name: "Plymouth" },
    { id: "1359", name: "Luton" },
    { id: "63", name: "Leeds" },
    { id: "247", name: "Celtic" },

  ];

  return (
    <SelectorWithSearch
      items={teams}
      onSelect={onSelect}
      onClose={onClose}
      type="Teams"
    />
  );
};

const CompetitionSelector = ({ onSelect, onClose }) => {
  const competitions = [
    { id: "2", name: "UEFA Champions League" },
    { id: "3", name: "UEFA Europa League" },
    { id: "5", name: "UEFA Nations League" },
    { id: "39", name: "Premier League" },
    { id: "78", name: "Bundesliga" },
    { id: "135", name: "Serie A" },
    { id: "137", name: "Coppa Italia" },
    { id: "140", name: "La Liga" },
    { id: "61", name: "Ligue 1" },
    { id: "62", name: "Ligue 2" }
  ];

  return (
    <SelectorWithSearch
      items={competitions}
      onSelect={onSelect}
      onClose={onClose}
      type="Competitions"
    />
  );
};

const MarkdownToolbar = ({ onInsert }) => {
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showCompetitionSelector, setShowCompetitionSelector] = useState(false);
  
  const handleTeamSelect = (teamId, teamName) => {
    onInsert('team', { id: teamId, name: teamName });
    setShowTeamSelector(false);
  };

  const handleCompetitionSelect = (competitionId, competitionName) => {
    onInsert('competition', { id: competitionId, name: competitionName });
    setShowCompetitionSelector(false);
  };

  return (
    <div className="relative flex gap-2 mb-2 p-2 bg-gray-800 rounded">
      <button
        onClick={() => onInsert('bold')}
        className="p-1 hover:bg-gray-700 rounded text-white"
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => onInsert('italic')}
        className="p-1 hover:bg-gray-700 rounded text-white"
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => onInsert('heading')}
        className="p-1 hover:bg-gray-700 rounded text-white"
        title="Heading"
      >
        H
      </button>
      <button
        onClick={() => onInsert('list')}
        className="p-1 hover:bg-gray-700 rounded text-white"
        title="List"
      >
        • List
      </button>
      <div className="relative">
        <button
          onClick={() => setShowTeamSelector(!showTeamSelector)}
          className="p-1 hover:bg-gray-700 rounded text-white flex items-center"
          title="Insert Team"
        >
          ⚽ Team
        </button>
        {showTeamSelector && (
          <TeamSelector
            onSelect={handleTeamSelect}
            onClose={() => setShowTeamSelector(false)}
          />
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setShowCompetitionSelector(!showCompetitionSelector)}
          className="p-1 hover:bg-gray-700 rounded text-white flex items-center"
          title="Insert Competition"
        >
          🏆 Competition
        </button>
        {showCompetitionSelector && (
          <CompetitionSelector
            onSelect={handleCompetitionSelect}
            onClose={() => setShowCompetitionSelector(false)}
          />
        )}
      </div>
    </div>
  );
};

// Custom components for markdown rendering
const MarkdownComponents = {
  p: ({ children }) => {
    const content = children.toString();
    const teamLogoRegex = /\[\[TEAM:(\d+)\]\]/g;
    const compLogoRegex = /\[\[COMP:(\d+)\]\]/g;
    
    if (!content.match(teamLogoRegex) && !content.match(compLogoRegex)) {
      return <p className="mb-4 text-white">{children}</p>;
    }

    const elements = [];
    let lastIndex = 0;
    let match;

    // Find and replace team logos
    while ((match = teamLogoRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        elements.push(content.substring(lastIndex, match.index));
      }
      const [_, teamId] = match;
      elements.push(
        <span key={`team-${match.index}`} className="inline-flex items-center -mt-1 mx-1">
          <TeamLogo teamId={teamId} teamName="" />
        </span>
      );
      lastIndex = teamLogoRegex.lastIndex;
    }

    // Find and replace competition logos
    const remainingContent = content.substring(lastIndex);
    lastIndex = 0;
    
    while ((match = compLogoRegex.exec(remainingContent)) !== null) {
      if (match.index > lastIndex) {
        elements.push(remainingContent.substring(lastIndex, match.index));
      }
      const [_, compId] = match;
      elements.push(
        <span key={`comp-${match.index}`} className="inline-flex items-center -mt-1 mx-1">
          <img
            src={`/logos/competitions/${compId}.png`}
            alt=""
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.target.src = '/fallback-competition-logo.png';
            }}
          />
        </span>
      );
      lastIndex = compLogoRegex.lastIndex;
    }

    // Add any remaining text
    if (lastIndex < remainingContent.length) {
      elements.push(remainingContent.substring(lastIndex));
    }
    
    return <p className="mb-4 text-white leading-relaxed">{elements}</p>;
  }
};

export const BlogEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    publishDate: new Date().toISOString().split('T')[0],
    isPublished: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const response = await api.getAdminBlogPost(id);
        const post = response.data;
        setFormData({
          title: post.title,
          content: post.content,
          publishDate: new Date(post.publishDate).toISOString().split('T')[0],
          isPublished: post.isPublished
        });
      } catch (error) {
        console.error('Error fetching blog post:', error);
        setError('Failed to fetch blog post');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleToolbarInsert = (type, value) => {
    const textArea = document.querySelector('textarea');
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const text = formData.content;
    let insertion = '';

    switch (type) {
      case 'bold':
        insertion = `**${text.substring(start, end) || 'bold text'}**`;
        break;
      case 'italic':
        insertion = `*${text.substring(start, end) || 'italic text'}*`;
        break;
      case 'heading':
        insertion = `\n## ${text.substring(start, end) || 'Heading'}\n`;
        break;
      case 'list':
        insertion = `\n- ${text.substring(start, end) || 'List item'}\n`;
        break;
      case 'team':
        insertion = `[[TEAM:${value.id}]] ${value.name}`;
        break;
      case 'competition':
        insertion = `[[COMP:${value.id}]] ${value.name}`;
        break;
      default:
        return;
    }

    const newContent = 
      text.substring(0, start) + 
      insertion + 
      text.substring(end);
    
    setFormData({ ...formData, content: newContent });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (id) {
        await api.updateBlogPost(id, formData);
      } else {
        await api.createBlogPost(formData);
      }
      navigate('/admin/blog', { replace: true });
    } catch (error) {
      console.error('Error saving blog post:', error);
      setError(error.response?.data?.message || 'Failed to save blog post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-green-400 mb-6">
        {id ? 'Edit Blog Post' : 'Create New Blog Post'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full p-2 bg-gray-700 text-white rounded"
            required
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-white">Content (Markdown)</label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-green-400 hover:text-green-500"
            >
              {showPreview ? 'Show Editor' : 'Show Preview'}
            </button>
          </div>

          {showPreview ? (
            <div className="w-full p-4 bg-gray-700 text-white rounded h-96 overflow-auto prose prose-invert max-w-none">
              <ReactMarkdown components={MarkdownComponents}>
                {formData.content}
              </ReactMarkdown>
            </div>
          ) : (
            <>
              <MarkdownToolbar onInsert={handleToolbarInsert} />
              <textarea
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                className="w-full p-2 bg-gray-700 text-white rounded h-96 font-mono"
                required
              />
            </>
          )}
        </div>
        
        <div>
          <label className="block text-white mb-2">Publish Date</label>
          <input
            type="date"
            value={formData.publishDate}
            onChange={e => setFormData({...formData, publishDate: e.target.value})}
            className="w-full p-2 bg-gray-700 text-white rounded"
            required
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isPublished}
            onChange={e => setFormData({...formData, isPublished: e.target.checked})}
            className="mr-2"
          />
          <label className="text-white">Publish immediately</label>
        </div>
        
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Saving...' : id ? 'Update Post' : 'Create Post'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/admin/blog')}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};