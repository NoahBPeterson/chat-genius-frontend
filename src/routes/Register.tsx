import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import API_Client from '../API_Client';

const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayname, setDisplayname] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await API_Client.post('/api/register', { email, password, displayname });
            localStorage.setItem('token', response.data.token);
            navigate('/');
        } catch (error) {
            alert('Registration failed');
            console.error('Registration error:', error);
        }
    };

    return (
        <div className="bg-purple-800 p-8 rounded-lg shadow-lg w-[800px]">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-[384px] mx-auto">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 rounded bg-gray-900 text-white border border-purple-600 focus:outline-none focus:border-purple-400"
                    required
                />
                <input
                    type="text"
                    placeholder="Display Name"
                    value={displayname}
                    onChange={(e) => setDisplayname(e.target.value)}
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
                <Button variant="contained" color="primary" type="submit">
                    Register
                </Button>
                
                <div className="text-center mt-4">
                    <Link to="/login" className="text-blue-400 hover:text-blue-300">
                        Already have an account? Login here
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

export default Register;
