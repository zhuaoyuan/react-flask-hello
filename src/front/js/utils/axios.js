import axios from 'axios';

// 统一使用 localhost
const backendUrl = 'http://localhost:3001';

// 创建自定义的 axios 实例
const axiosInstance = axios.create({
    baseURL: backendUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器
axiosInstance.interceptors.request.use(
    (config) => {
        // 确保每个请求都带上 credentials
        config.withCredentials = true;
        config.headers = {
            ...config.headers,
            'X-Requested-With': 'XMLHttpRequest'
        };
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // 清除本地存储的用户信息
            localStorage.removeItem('user');
            // 如果不在登录页，则重定向到登录页
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;