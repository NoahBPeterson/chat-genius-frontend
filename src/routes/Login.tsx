import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import API_Client from '../API_Client';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await API_Client.post('/api/login', { email, password });
            localStorage.setItem('token', response.data.token);
            navigate('/'); // Redirect to a default channel
        } catch (error) {
            alert('Login failed');
            console.error('Login error:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-4">
            <h1 className="text-xl font-bold">Login</h1>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded w-full p-2"
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border rounded w-full p-2"
            />
            <Button variant="contained" color="primary" type="submit">
                Login
            </Button>

            <div className="text-center mt-4">
                <Link to="/register" className="text-blue-500 hover:text-blue-700">
                    Need an account? Register here
                </Link>
            </div>
        </form>
    );
};

export default Login;
