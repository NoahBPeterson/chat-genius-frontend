import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Messages from './Messages';
import API_Client from '../API_Client';
import { jwtDecode } from "jwt-decode";

interface User {
    id: string;
    display_name: string;
    email: string;
}

const MainPage: React.FC = () => {
    const [channels, setChannels] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isDM, setIsDM] = useState(false);
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

    const fetchUsers = async () => {
        try {
            const response = await API_Client.get('/api/users');
            if (response.status === 200) {
                setUsers(response.data);
                console.log("users", response.data);
            } else {
                navigate('/login');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            navigate('/login');
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: { role: string } = jwtDecode(token);
            setUserRole(decoded.role);
        } else {
            navigate('/login');
        }

        fetchChannels();
        fetchUsers();
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

    const handleDMSelect = async (userId: string) => {
        try {
            const response = await API_Client.post(`/api/dm/${userId}`);
            setSelectedChannelId(response.data.id);
            setSelectedUserId(userId);
            setIsDM(true);
        } catch (error) {
            console.error('Error creating DM:', error);
        }
    };

    const handleChannelSelect = (channelId: string) => {
        setSelectedChannelId(channelId);
        setSelectedUserId(null);
        setIsDM(false);
    };

    console.log("users", users);
    console.log("display_name/email", (users.find(u => u.id === selectedChannelId)?.email));
    console.log("display_name/email", (users.find(u => u.id === selectedChannelId)?.display_name));
    console.log("both", (users.find(u => u.id === selectedChannelId)?.display_name ?? users.find(u => u.id === selectedChannelId)?.email));
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
                    users={users}
                    onChannelSelect={handleChannelSelect}
                    onUserSelect={handleDMSelect}
                    setIsDM={setIsDM}
                />

                {/* Footer (Settings/Profile Icons) */}
                <div className="flex items-center justify-between p-4 border-t border-gray-700">
                    <button className="hover:text-gray-400">⚙️</button>
                    <button className="hover:text-gray-400">👤</button>
                </div>
            </div>

                {/* Messages Area */}
                <div className="flex-1">
                {selectedChannelId && (
                    <Messages 
                        channelId={selectedChannelId}
                        channelName={isDM 
                            ? users.find(u => u.id === selectedUserId)?.display_name ?? 
                              users.find(u => u.id === selectedUserId)?.email
                            : channels.find(c => c.id === selectedChannelId)?.name
                        }
                        isDM={isDM}
                    />
                )}
            </div>
        </div>
    );
};

export default MainPage;