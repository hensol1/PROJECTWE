import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

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

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const response = await api.getAdminBlogPost(id); // Use the admin endpoint
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
      // Use location state and pathname
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
          <label className="block text-white mb-2">Content (Markdown)</label>
          <textarea
            value={formData.content}
            onChange={e => setFormData({...formData, content: e.target.value})}
            className="w-full p-2 bg-gray-700 text-white rounded h-96 font-mono"
            required
          />
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
            onClick={() => navigate('/admin')}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};