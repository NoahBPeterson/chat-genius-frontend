import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Messages from './Messages';
import API_Client, { hasValidToken } from '../API_Client';
import { jwtDecode } from "jwt-decode";
import { Message, JWTPayload } from '../types/Types';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';

interface User {
    id: string;
    display_name: string;
    email: string;
}

// Add a special channel ID for search results
const SEARCH_CHANNEL_ID = 'search-results';

const MainPage: React.FC = () => {
    const [channels, setChannels] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string>("1");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isDM, setIsDM] = useState(false);
    const [newChannelName, setNewChannelName] = useState<string>('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isInputVisible, setIsInputVisible] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('q');

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
            
            // Remove search query from URL
            navigate('/', { replace: true });
            
            setSelectedChannelId(response.data.id);
            setSelectedUserId(userId);
            setIsDM(true);

            await fetchMessages(response.data.id);
        } catch (error) {
            console.error('Error setting up DM:', error);
        }
    };

    const handleChannelSelect = async (channelId: string) => {
        setMessages([]); // Clear messages first
        
        // Remove search query from URL
        navigate('/', { replace: true });
        
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
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSearch = async (searchQuery: string) => {
        try {
            const response = await API_Client.get(`/api/messages/search`, { params: { query: searchQuery } });
            if (response.status === 200) {
                console.log("Search response:", response.data);
                setMessages(response.data);
                setSelectedChannelId(SEARCH_CHANNEL_ID);
                setIsDM(false);
                // Update URL with search query
                navigate(`/?q=${encodeURIComponent(searchQuery)}`);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    };

    const handleMessageClick = async (channelId: string, messageId: string) => {
        setMessages([]); // Clear messages first
        
        const channel = channels.find(c => String(c.id) === String(channelId));
        console.log('Clicked message channel:', {
            channel,
            channelId,
            isDM: channel?.is_dm,
            name: channel?.name
        });

        setSelectedChannelId(channelId);
        setIsDM(channel?.is_dm || false);
        
        // If it's a DM, set the selectedUserId
        if (channel?.is_dm) {
            const currentUserId = Number(jwtDecode<JWTPayload>(localStorage.getItem('token') as string).userId);
            const otherUserId = channel.dm_participants.find((id: number) => id !== currentUserId);
            setSelectedUserId(otherUserId?.toString() || null);
        } else {
            setSelectedUserId(null);
        }
        
        navigate(`/?message=${messageId}`, { replace: true });
        await fetchMessages(channelId);
    };

    const handleFileUpload = async (storagePath: string, filename: string, size: number, mimeType: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'new_message',
                channelId: selectedChannelId,
                content: `[File: ${filename}](${storagePath})`,
                isDM: isDM,
                token: localStorage.getItem('token'),
                attachments: [{
                    filename: filename,
                    mime_type: mimeType,
                    size: size,
                    storage_path: storagePath
                }]
            }));
        }
    };
    console.log("users", users);
    console.log("both", (users.find(u => u.id === selectedChannelId)?.display_name ?? users.find(u => u.id === selectedChannelId)?.email));

    return (
    <div className="flex h-screen w-screen">
        {/* Sidebar */}
        <div className="w-1/5 min-w-[250px] bg-gray-800 text-white flex flex-col justify-between flex-shrink-0">
            <SearchBar onSearch={handleSearch} />
            
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

            {/* Messages/Search Area */}
            <div className="flex-1">
                {selectedChannelId && (
                    <Messages 
                        channelId={selectedChannelId}
                        channelName={
                            selectedChannelId === SEARCH_CHANNEL_ID 
                                ? `Search Results: "${searchParams.get('q')}"` 
                                : isDM 
                                    ? users.find(u => String(u.id) === String(selectedUserId))?.display_name ?? 
                                      users.find(u => String(u.id) === String(selectedUserId))?.email
                                    : channels.find(c => String(c.id) === String(selectedChannelId))?.name
                        }
                        isDM={isDM}
                        messages={messages}
                        onSendMessage={sendMessage}
                        isSearchResults={selectedChannelId === SEARCH_CHANNEL_ID}
                        channels={channels}
                        users={users}
                        onMessageClick={handleMessageClick}
                        onFileUpload={handleFileUpload}
                    />
                )}
            </div>
        </div>
    );
};

export default MainPage;