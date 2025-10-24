import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/login');
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="dashboard-page">
      <h1>用户仪表盘</h1>
      <div className="user-info">
        <p>欢迎，{user.username}！</p>
        <p>邮箱：{user.email}</p>
      </div>
      <button onClick={handleLogout}>退出登录</button>
    </div>
  );
};

export default DashboardPage;
