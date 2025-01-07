import axios from 'axios';

const API_Client = axios.create({
    baseURL: 'http://localhost:3000',
});

// Initialize token from localStorage
const token = localStorage.getItem('token');
if (token) {
    API_Client.defaults.headers.common['Authorization'] = `${token}`;
}

export const setAuthToken = (token: string) => {
    if (token) {
        API_Client.defaults.headers.common['Authorization'] = `${token}`;
        localStorage.setItem('token', token);
    } else {
        delete API_Client.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
    }
};

export const hasValidToken = () => {
    const token = localStorage.getItem('token');
    return !!token;
};

export default API_Client;
