import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { JWTPayload } from '../types/Types';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/" replace />;
    }

    try {
        const decoded = jwtDecode<JWTPayload>(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp && decoded.exp < currentTime) {
            localStorage.removeItem('token');
            return <Navigate to="/" replace />;
        }

        return <>{children}</>;
    } catch {
        localStorage.removeItem('token');
        return <Navigate to="/" replace />;
    }
};

export default ProtectedRoute; 