import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const pendingLoginChallenge = sessionStorage.getItem('pendingLoginChallenge');

  if (pendingLoginChallenge) return <Navigate to="/verify-login-otp" replace />;
  if (token) return children;

  return <Navigate to="/login" replace />;
};

export default PrivateRoute;