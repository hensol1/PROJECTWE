import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api';

export const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        console.log('Fetching blog post with slug:', slug);
        const response = await api.getBlogPost(slug);
        console.log('Blog post response:', response.data);
        setPost(response.data);
      } catch (error) {
        console.error('Error fetching blog post:', error);
        setError('Failed to fetch blog post');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-500">
          <p>Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <article className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-green-400 mb-4">{post.title}</h1>
        <p className="text-gray-400 mb-8">
          {new Date(post.publishDate).toLocaleDateString()}
        </p>
        <div 
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: post.content.replace(/\n/g, '<br />') 
          }}
        />
      </article>
    </div>
  );
};