import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Channels from './routes/Channels';
import DMs from './routes/DMs';
import Threads from './routes/Threads';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/channels/:id" element={<Channels />} />
                <Route path="/dm/:id" element={<DMs />} />
                <Route path="/threads/:id" element={<Threads />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
