import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import Login from './routes/Login';
import Register from './routes/Register';
import Landing from './routes/Landing';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        const newToken = localStorage.getItem('token');
        setToken(newToken);
    }, []);

    const renderProtectedRoute = () => (
        <ProtectedRoute>
            <MainPage />
        </ProtectedRoute>
    );

    const renderLanding = () => <Landing />;

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={token ? renderProtectedRoute() : renderLanding()} />
                <Route path="/login" element={<Login setToken={setToken} />} />
                <Route path="/register" element={<Register />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
