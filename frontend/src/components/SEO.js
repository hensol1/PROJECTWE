// src/components/SEO.js
import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = 'We Know Better - Football Match Predictions & Analysis',
  description = 'Join We Know Better to make football predictions, compare with AI accuracy, and compete with fans worldwide. Get real-time match insights and track your prediction success.',
  path = '',
  type = 'website'
}) => {
  const siteUrl = 'https://weknowbetter.app';
  const fullUrl = `${siteUrl}${path}`;
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}/og-image.jpg`} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}/og-image.jpg`} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
};

export default SEO;