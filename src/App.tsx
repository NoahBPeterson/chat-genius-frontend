import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import Login from './routes/Login';
import Register from './routes/Register';

const App: React.FC = () => {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Routes>
            </BrowserRouter>
        </>
    );
};

export default App;
