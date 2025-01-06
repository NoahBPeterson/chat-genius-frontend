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
        <div className="flex flex-grow h-screen flex flex-col">
            <div className="w-1/5 bg-gray-800 text-white flex flex-col justify-between p-4">
                {userRole === 'admin' && (
                    <div>
                        <button onClick={() => setIsInputVisible(!isInputVisible)}>
                            {isInputVisible ? '-' : '+'}
                        </button>
                        {isInputVisible && (
                            <div>
                                <input
                                    type="text"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    onKeyUp={handleKeyPress}
                                    placeholder="New Channel Name"
                                />
                            </div>
                        )}
                    </div>
                )}
                <Sidebar channels={channels} setSelectedChannelId={setSelectedChannelId} />
                <div className="flex-1 bg-gray-100 flex flex-col">
                    <button className="hover:text-gray-400">⚙️</button>
                    <button className="hover:text-gray-400">👤</button>
                </div>
            </div>
            <div className="messages-container bg-purple-700">
                {selectedChannelId && <Messages channelId={selectedChannelId} />}
            </div>
        </div>
    );
};

export default MainPage;