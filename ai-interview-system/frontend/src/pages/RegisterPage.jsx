import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoginForm from '../components/Auth/LoginForm';
import './RegisterPage.css';

const RegisterPage = () => {
  const { register, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      clearError();
      await register(userData);
      toast.success('注册成功，请登录！');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || '注册失败，请重试。');
    }
  };

  return (
    <div className="register-page">
      <h1>注册</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">用户名</label>
          <input type="text" id="username" name="username" required />
        </div>
        <div className="form-group">
          <label htmlFor="email">邮箱</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div className="form-group">
          <label htmlFor="password">密码</label>
          <input type="password" id="password" name="password" required />
        </div>
        <button type="submit">注册</button>
      </form>
    </div>
  );
};

export default RegisterPage;
