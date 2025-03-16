import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import axios from '../utils/axios';

export const PrivateRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await axios.get('/api/auth/current_user');
                if (response.data.success) {
                    setIsAuthenticated(true);
                    // 更新本地存储的用户信息
                    localStorage.setItem('user', JSON.stringify(response.data.result));
                } else {
                    setIsAuthenticated(false);
                    localStorage.removeItem('user');
                }
            } catch (error) {
                console.error('验证用户状态失败:', error);
                setIsAuthenticated(false);
                localStorage.removeItem('user');
                message.error(error.response?.data?.error_message || '登录已过期，请重新登录');
            }
        };

        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        // 正在验证中，可以显示加载状态
        return <div>加载中...</div>;
    }

    if (!isAuthenticated) {
        // 未登录，重定向到登录页
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 已登录，显示受保护的内容
    return children;
}; 