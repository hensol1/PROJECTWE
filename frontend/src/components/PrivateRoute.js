import React from 'react';
import { Navigate } from 'react-router-dom';

export const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('adminToken') !== null;

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};