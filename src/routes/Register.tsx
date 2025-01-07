import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
            console.log(email, password, displayname);
            const response = await API_Client.post('/api/register', { email, password, displayname });
            localStorage.setItem('token', response.data.token);
            console.log(response.data, response.data.token);
            navigate('/'); // Redirect to a default channel
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
        </form>
    );
};

export default Register;
