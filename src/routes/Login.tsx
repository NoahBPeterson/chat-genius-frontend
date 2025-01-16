import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import API_Client from '../API_Client';

interface LoginProps {
    setToken: (token: string | null) => void;
}

const Login: React.FC<LoginProps> = ({ setToken }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await API_Client.post('/api/login', { email, password });
            if (response.status === 200) {
                localStorage.setItem('token', response.data.token);
                setToken(response.data.token);
                navigate('/');
            }
        } catch (error) {
            console.error('Login error:', error);
            setLoginError(true);
        }
    };

    return (
        <div className="bg-purple-800 p-8 rounded-lg shadow-lg w-[800px]">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-[384px] mx-auto">
                {loginError && (
                    <p className="text-red-400 text-center mb-4">
                        Login failed. Wrong email or password. 
                        <Link to="/register" className="text-blue-400 hover:text-blue-300 ml-2">
                            Create an account?
                        </Link>
                    </p>
                )}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 rounded bg-gray-900 text-white border border-purple-600 focus:outline-none focus:border-purple-400"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 rounded bg-gray-900 text-white border border-purple-600 focus:outline-none focus:border-purple-400"
                    required
                />
                <Button 
                    variant="contained" 
                    color="primary" 
                    type="submit"
                    fullWidth
                    style={{ textTransform: 'uppercase' }}
                >
                    LOGIN
                </Button>

                <div className="text-center mt-4">
                    <Link to="/register" className="text-blue-400 hover:text-blue-300">
                        Don't have an account? Register here
                    </Link>
                    <div className="mt-2">
                        <Link to="/" className="text-purple-300 hover:text-purple-200">
                            Back to home
                        </Link>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Login;
