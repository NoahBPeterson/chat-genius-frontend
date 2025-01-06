import axios from 'axios';

const API_Client = axios.create({
    baseURL: 'http://localhost:3000', // Replace with your backend URL if hosted elsewhere
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `${localStorage.getItem('token')}`
    },
});

export default API_Client;
