import React from 'react';
import LoginForm from '../components/Auth/LoginForm';
import './LoginPage.css';

const LoginPage = () => {
  return (
    <div className="login-page">
      <h1>登录</h1>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
