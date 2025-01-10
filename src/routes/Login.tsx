import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import API_Client from '../API_Client';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await API_Client.post('/api/login', { email, password });
            if (response.status === 200) {
                const token = response.data.token;
                localStorage.setItem('token', token);
                navigate('/');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Invalid credentials');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-4">
            {error && <div className="text-red-500">{error}</div>}
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
