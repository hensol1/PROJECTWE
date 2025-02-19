import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  if (error || !latestPost) {
    return null;
  }

  const handleClick = () => {
    navigate(`/blog/${latestPost.slug}`);
  };

  return (
    <div 
    className="cursor-pointer bg-[#1a1f2b] rounded-lg p-4"
    onClick={handleClick}
  >
    <h3 className="text-[#40c456] text-sm font-semibold mb-2">Today's Blog</h3>
    <div className="text-white">
      <h4 className="font-semibold text-sm mb-2">{latestPost.title}</h4>
      <div className="text-xs text-gray-400 mb-3">
  {renderMarkdown(latestPost.content.substring(0, 150), { preview: true })}
</div>
      <span className="text-[#40c456] text-xs hover:text-[#3ab04e]">
        Read full article →
      </span>
    </div>
  </div>
);
};