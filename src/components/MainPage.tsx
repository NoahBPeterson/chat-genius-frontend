import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Messages from './Messages';
import API_Client, { hasValidToken } from '../API_Client';
import { jwtDecode } from "jwt-decode";
import { Message, JWTPayload } from '../types/Types';

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
    const [messages, setMessages] = useState<Message[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const navigate = useNavigate();

    const fetchChannels = async () => {
        try {
            if (!hasValidToken()) {
                navigate('/login');
                return;
            }
            const response = await API_Client.get('/api/channels');
            if (response.status === 200) {
                setChannels(response.data);
                if (response.data.length > 0) {
                    const initialChannelId = response.data[0].id;
                    setSelectedChannelId(initialChannelId);
                    await fetchMessages(initialChannelId);
                }
            }
        } catch (error) {
            console.error('Error fetching channels:', error);
            navigate('/login');
        }
    };

    const fetchUsers = async () => {
        try {
            if (!hasValidToken()) {
                navigate('/login');
                return;
            }
            const response = await API_Client.get('/api/users');
            if (response.status === 200) {
                setUsers(response.data);
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

    useEffect(() => {
        const connectWebSocket = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                return;
            }

            wsRef.current = new WebSocket('ws://localhost:8080');
            
            wsRef.current.onopen = () => {
                console.log('WebSocket Connected');
            };

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('WebSocket received:', data);

                switch (data.type) {
                    case 'new_message':
                        /*
                        console.log("new_message: ", {
                            messageChannelId: data.message.channel_id,
                            currentChannelId: selectedChannelId,
                            isCurrentChannel: data.message.channel_id === selectedChannelId
                        });*/
                        
                        if (data.message.channel_id === selectedChannelId) {
                            setMessages(prev => {
                                const messageExists = prev.some(msg => 
                                    msg.id === data.message.id && 
                                    msg.channel_id === data.message.channel_id
                                );
                                if (messageExists) {
                                    return prev;
                                }
                                return [...prev, data.message];
                            });
                        }
                        break;
                    case 'user_update':
                        setUsers(data.users);
                        break;
                    case 'channel_update':
                        setChannels(data.channels);
                        break;
                    default:
                        console.log('Unknown message type:', data);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket disconnected. Attempting to reconnect...');
                setTimeout(connectWebSocket, 1000);
            };
        };

        connectWebSocket();
        
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [selectedChannelId]);

    // Function to send messages through WebSocket
    const sendMessage = (content: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'new_message',
                channelId: selectedChannelId,
                content: content,
                isDM: isDM,
                token: localStorage.getItem('token')
            }));
        }
    };

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

    const handleUserSelect = async (userId: string) => {
        try {
            const response = await API_Client.post(`/api/dm/${userId}`);
            setMessages([]); // Clear messages first
            setSelectedChannelId(response.data.id);
            setSelectedUserId(userId);
            setIsDM(true);

            // Fetch initial messages via REST API
            await fetchMessages(response.data.id);
        } catch (error) {
            console.error('Error setting up DM:', error);
        }
    };

    const handleChannelSelect = async (channelId: string) => {
        setMessages([]); // Clear messages first
        
        // Wait for state update to complete
        await new Promise(resolve => {
            setSelectedChannelId(channelId);
            setSelectedUserId(null);
            setIsDM(false);
            resolve(null);
        });
        
        await fetchMessages(channelId);
    };

    // Add this function to fetch messages via REST API
    const fetchMessages = async (channelId: string) => {
        try {
            const response = await API_Client.get(`/api/channels/${channelId}/messages`);
            if (response.status === 200) {
                setMessages(response.data);
            }
            console.log("fetchMessages for channel", channelId, ":", response.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    console.log("users", users);
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
                    onUserSelect={handleUserSelect}
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
                        messages={messages}
                        onSendMessage={sendMessage}
                    />
                )}
            </div>
        </div>
    );
};

export default MainPage;