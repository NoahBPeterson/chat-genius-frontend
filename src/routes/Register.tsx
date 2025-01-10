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
            navigate('/login'); // Redirect to a default channel
        } catch (error) {
            alert('Registration failed');
            console.error('Registration error:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-4">
            <h1 className="text-xl font-bold">Register</h1>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded w-full p-2"
            />
            <input
                type="text"
                placeholder="Display Name"
                value={displayname}
                onChange={(e) => setDisplayname(e.target.value)}
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
                Register
            </Button>
            
            <div className="text-center mt-4">
                <Link to="/login" className="text-blue-500 hover:text-blue-700">
                    Already have an account? Login here
                </Link>
            </div>
        </form>
    );
};

export default Register;
