import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.getBlogPosts();
        setPosts(response.data.posts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
        setError('Failed to fetch blog posts');
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-green-400 mb-8">Match Previews</h1>
        <p className="text-gray-600">No match previews available yet.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-400 mb-8">Match Previews</h1>
      <div className="space-y-6">
        {posts.map(post => (
          <article key={post._id} className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-2">
              <Link to={`/blog/${post.slug}`} className="hover:text-green-400">
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {new Date(post.publishDate).toLocaleDateString()}
            </p>
            <p className="text-gray-300 mb-4">
              {post.content.substring(0, 300)}...
            </p>
            <Link 
              to={`/blog/${post.slug}`}
              className="text-green-400 hover:text-green-300"
            >
              Read more →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
};