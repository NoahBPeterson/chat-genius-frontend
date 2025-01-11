import axios from 'axios';

const getBaseUrl = () => {
    if (import.meta.env.DEV) {
        return 'http://localhost:3000';
    }
    // In production, use the same host as the frontend
    return `${window.location.protocol}//${window.location.host}`;
};

const API_Client = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json'
    }
});

export const hasValidToken = () => {
    const token = localStorage.getItem('token');
    return !!token;
};

// Add request interceptor to add token
API_Client.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle 401s
API_Client.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default API_Client;
