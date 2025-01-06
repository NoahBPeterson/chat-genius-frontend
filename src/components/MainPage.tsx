import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Messages from './Messages';
import API_Client from '../API_Client';
import { jwtDecode } from "jwt-decode";

const MainPage: React.FC = () => {
    const [channels, setChannels] = useState<any[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [newChannelName, setNewChannelName] = useState<string>('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isInputVisible, setIsInputVisible] = useState<boolean>(false);
    const navigate = useNavigate();

    const fetchChannels = async () => {
        try {
            const response = await API_Client.get('/api/channels');
            if (response.status === 200) {
                setChannels(response.data);
                if (response.data.length > 0) {
                    setSelectedChannelId(response.data[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching channels:', error);
            navigate('/login');
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: { role: string } = jwtDecode(token);
            setUserRole(decoded.role);
        }

        fetchChannels();
    }, [navigate]);

    const handleCreateChannel = async () => {
        if (!newChannelName) return;
        try {
            const response = await API_Client.post('/api/channels', { name: newChannelName });
            if (response.status === 201) {
                setChannels([...channels, response.data]);
                setNewChannelName('');
                setIsInputVisible(false);
            }
        } catch (error) {
            console.error('Error creating channel:', error);
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleCreateChannel();
        }
    };

    return (
    <div className="flex h-screen w-screen">
        {/* Sidebar */}
        <div className="w-1/5 min-w-[250px] bg-gray-800 text-white flex flex-col justify-between flex-shrink-0">
            {/* Admin Controls */}
            {userRole === 'admin' && (
                    <div className="p-4 border-b border-gray-700">
                        <button
                            onClick={() => setIsInputVisible(!isInputVisible)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded w-full"
                        >
                            {isInputVisible ? 'Cancel' : 'New Channel'}
                        </button>
                        {isInputVisible && (
                            <div className="mt-4">
                                <input
                                    type="text"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    onKeyUp={handleKeyPress}
                                    placeholder="New Channel Name"
                                    className="w-full p-2 border rounded text-black"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Sidebar Content */}
                <Sidebar
                    channels={channels}
                    setSelectedChannelId={setSelectedChannelId}
                />

                {/* Footer (Settings/Profile Icons) */}
                <div className="flex items-center justify-between p-4 border-t border-gray-700">
                    <button className="hover:text-gray-400">⚙️</button>
                    <button className="hover:text-gray-400">👤</button>
                </div>
            </div>

                {/* Messages Area */}
                <div className="flex-1">
                {selectedChannelId && <Messages channelId={selectedChannelId} />}
            </div>
        </div>
    );
};

export default MainPage;