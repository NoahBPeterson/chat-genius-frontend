import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import Login from './routes/Login';
import Register from './routes/Register';
import Landing from './routes/Landing';
import ProtectedRoute from './components/ProtectedRoute';
import { jwtDecode } from 'jwt-decode';
import { JWTPayload } from './types/Types';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);

    // Validate token on mount and when localStorage changes
    useEffect(() => {
        const validateAndSetToken = () => {
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setToken(null);
                return;
            }

            try {
                const decoded = jwtDecode<JWTPayload>(storedToken);
                const currentTime = Date.now() / 1000;
                
                if (decoded.exp && decoded.exp < currentTime) {
                    localStorage.removeItem('token');
                    setToken(null);
                } else {
                    setToken(storedToken);
                }
            } catch {
                localStorage.removeItem('token');
                setToken(null);
            }
        };

        validateAndSetToken();

        // Listen for storage changes from other tabs
        const handleStorageChange = () => {
            validateAndSetToken();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const renderProtectedRoute = () => (
        <ProtectedRoute>
            <MainPage setToken={setToken} />
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
