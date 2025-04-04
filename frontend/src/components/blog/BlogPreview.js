import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Newspaper } from 'lucide-react'; // Import Newspaper icon or any suitable icon
import api from '../../api';
import { renderMarkdown } from './MarkdownRenderer';

export const BlogPreview = () => {
  const [latestPost, setLatestPost] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatestPost = async () => {
      try {
        const response = await api.getLatestPost();
        if (response.data) {
          setLatestPost(response.data);
        }
      } catch (error) {
        console.error('Error fetching latest blog post:', error);
        setError('Failed to fetch latest post');
      }
    };

    fetchLatestPost();
  }, []);

  const handleClick = () => {
    if (latestPost) {
      navigate(`/blog/${latestPost.slug}`);
    }
  };

  // Updated container to match Today's Odds style
  return (
    <div 
      className="cursor-pointer bg-gray-900 rounded-lg overflow-hidden flex flex-col"
      onClick={handleClick}
    >
      {/* New header style matching Today's Odds */}
      <div className="bg-[#242938] p-3 border-b border-gray-700">
        <div className="flex items-center gap-2 justify-between">
          <h2 className="text-emerald-400 text-sm font-medium">Today's Blog</h2>
          <Newspaper size={16} className="text-gray-400" />
        </div>
      </div>
      
      {error || !latestPost ? (
        <div className="flex-grow flex items-center justify-center text-gray-400 text-sm p-4">
          No blog posts available
        </div>
      ) : (
        <div className="text-white flex flex-col flex-grow p-4">
          <h4 className="font-semibold text-sm mb-2">{latestPost.title}</h4>
          <div className="text-xs text-gray-400 mb-2 flex-grow overflow-hidden">
            {renderMarkdown(latestPost.content.substring(0, 100), { preview: true })}
          </div>
          <span className="text-emerald-400 text-xs hover:text-emerald-300 mt-auto">
            Read full article →
          </span>
        </div>
      )}
    </div>
  );
};