import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Messages from './Messages';
import API_Client, { hasValidToken } from '../API_Client';
import { jwtDecode } from "jwt-decode";
import { Message, JWTPayload, User, Thread } from '../types/Types';
import SearchBar from './SearchBar';
import ProfileMenu from './ProfileMenu';
import UserStatus from './UserStatus';

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
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const fetchChannels = async () => {
        try {
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
            // Don't try to reconnect if we already have an open connection
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                return;
            }

            // Don't try to reconnect if we're in the process of connecting
            if (wsRef.current?.readyState === WebSocket.CONNECTING) {
                return;
            }

            wsRef.current = new WebSocket('ws://localhost:8080');
            
            const requestPresenceStatus = () => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'get_presence',
                        token: localStorage.getItem('token')
                    }));
                }
            };

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'authenticate',
                        token: localStorage.getItem('token')
                    }));
                    
                    setTimeout(requestPresenceStatus, 500);
                }
            };

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'error' && data.message === 'TokenExpiredError') {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }

                switch (data.type) {
                    case 'auth_success':
                        requestPresenceStatus();
                        break;
                    case 'message_updated':
                        if (data.message.channel_id === selectedChannelId) {
                            setMessages(prev => prev.map(msg => 
                                msg.id === data.message.id ? data.message : msg
                            ));
                        }
                        break;
                    case 'new_message':
                        // Don't add messages for search results view
                        if (selectedChannelId !== SEARCH_CHANNEL_ID && 
                            Number(data.message.channel_id) === Number(selectedChannelId)) {
                            setMessages(prev => {
                                const messageExists = prev.some(msg => msg.id === data.message.id);
                                if (messageExists) {
                                    return prev;
                                }
                                return [...prev, data.message];
                            });
                        }
                        break;
                    case 'presence_update':
                        setUsers(prevUsers => {
                            const updatedUsers = prevUsers.map(user => {
                                if (user.id === data.userId) {
                                    return { 
                                        ...user, 
                                        presence_status: data.status,
                                        custom_status: data.customStatus 
                                    };
                                }
                                return user;
                            });
                            return updatedUsers;
                        });
                        break;
                    case 'typing_update':
                        setUsers(prevUsers =>
                            prevUsers.map(user =>
                                user.id === data.userId
                                    ? {
                                        ...user,
                                        is_typing: {
                                            channels: {
                                                ...user.is_typing?.channels,
                                                [data.channelId]: data.contextType === 'channel' ? data.isTyping : user.is_typing?.channels?.[data.channelId]
                                            },
                                            threads: {
                                                ...user.is_typing?.threads,
                                                [data.threadId]: data.contextType === 'thread' ? data.isTyping : user.is_typing?.threads?.[data.threadId]
                                            }
                                        }
                                    }
                                    : user
                            )
                        );
                        break;
                    case 'typing_status':
                        setUsers(prevUsers =>
                            prevUsers.map(user => ({
                                ...user,
                                is_typing: {
                                    channels: {
                                        ...(user.is_typing?.channels || {}),
                                        [data.context_id]: data.context_type === 'channel' && data.users.includes(Number(user.id))
                                    },
                                    threads: {
                                        ...(user.is_typing?.threads || {}),
                                        [data.context_id]: data.context_type === 'thread' && data.users.includes(Number(user.id))
                                    }
                                }
                            }))
                        );
                        break;
                    case 'user_update':
                        setUsers(data.users);
                        break;
                    case 'presence_list':
                        setUsers(prevUsers => {
                            const updatedUsers = prevUsers.map(user => {
                                const presence = data.presences.find((p: any) => p.userId === user.id);
                                if (presence) {
                                    return {
                                        ...user,
                                        presence_status: presence.status,
                                        custom_status: presence.customStatus
                                    };
                                }
                                return user;
                            });
                            return updatedUsers;
                        });
                        break;
                    case 'bulk_presence_update':
                        setUsers(prevUsers => {
                            const updatedUsers = prevUsers.map(user => {
                                const presence = data.presenceData.find((p: any) => p.id === user.id);
                                if (presence) {
                                    return {
                                        ...user,
                                        presence_status: presence.presence_status
                                    };
                                }
                                return user;
                            });
                            return updatedUsers;
                        });
                        break;
                    case 'custom_status_update':
                        console.log('Handling custom status update:', data);
                        setUsers(prevUsers => {
                            const updatedUsers = prevUsers.map(user => {
                                if (user.id === data.userId) {
                                    return {
                                        ...user,
                                        custom_status: data.statusMessage
                                    };
                                }
                                return user;
                            });
                            return updatedUsers;
                        });
                        break;
                    case 'thread_created':
                        if (data.thread.channel_id === Number(selectedChannelId)) {
                            // Update the messages to show thread status
                            setMessages(prevMessages => 
                                prevMessages.map(msg => {
                                    if (msg.id === data.thread.parent_message_id) {
                                        return {
                                            ...msg,
                                            has_thread: true,
                                            thread: {
                                                ...data.thread,
                                                reply_count: 0
                                            }
                                        };
                                    }
                                    return msg;
                                })
                            );
                        }
                        break;
                        case 'thread_message':
                            // Update the parent message's thread info regardless of selected channel
                            setMessages(prev => prev.map(msg => {
                                if (msg.id === data.thread.parent_message_id && msg.thread) {
                                    return {
                                        ...msg,
                                        has_thread: true,
                                        thread: {
                                            id: msg.thread.id,
                                            channel_id: msg.thread.channel_id,
                                            parent_message_id: msg.thread.parent_message_id,
                                            created_at: msg.thread.created_at,
                                            last_reply_at: data.message.created_at,
                                            thread_starter_content: msg.thread.thread_starter_content,
                                            thread_starter_name: msg.thread.thread_starter_name,
                                            thread_starter_id: msg.thread.thread_starter_id,
                                            reply_count: data.thread.reply_count
                                        }
                                    };
                                }
                                return msg;
                            }));
                            break;
                    case 'reaction_update':
                        setMessages(prev => prev.map(msg => {
                            if (msg.id === data.messageId) {
                                return {
                                    ...msg,
                                    reactions: data.reactions
                                };
                            }
                            return msg;
                        }));
                        break;
                    default:
                        console.log('Unknown message type:', data);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (error instanceof Error && error.message.includes('TokenExpiredError')) {
                    localStorage.removeItem('token');
                    navigate('/login');
                }
            };

            wsRef.current.onclose = () => {
                setUsers(prevUsers => 
                    prevUsers.map(user => ({
                        ...user,
                        presence_status: 'offline'
                    }))
                );
                setTimeout(connectWebSocket, 1000);
            };
        };

        // Only connect if we have a valid token
        if (localStorage.getItem('token')) {
            connectWebSocket();
        }
        
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []); // Empty dependency array since we want this to run only once on mount

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
            
            const channelId = response.data.id.toString();
            
            // Update all state synchronously
            await Promise.all([
                new Promise<void>(resolve => {
                    setMessages([]);
                    setSelectedChannelId(channelId);
                    setSelectedUserId(userId);
                    setIsDM(true);
                    resolve();
                })
            ]);
            
            // Remove search query from URL
            navigate('/', { replace: true });

            await fetchMessages(channelId);
        } catch (error) {
            console.error('Error setting up DM:', error);
        }
    };

    const handleChannelSelect = async (channelId: string) => {
        // Update all state synchronously
        await Promise.all([
            new Promise<void>(resolve => {
                setMessages([]);
                setSelectedChannelId(channelId);
                setSelectedUserId(null);
                setIsDM(false);
                resolve();
            })
        ]);
        
        // Remove search query from URL
        navigate('/', { replace: true });
        
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

    const handleMessageClick = async (channelId: string, messageId: string, threadParentMessageId?: string) => {
        setMessages([]); // Clear messages first
        
        const channel = channels.find(c => String(c.id) === String(channelId));

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
        
        try {
            // First fetch messages to ensure we have the thread data
            const response = await API_Client.get(`/api/channels/${channelId}/messages`);
            if (response.status === 200) {
                const channelMessages = response.data;
                setMessages(channelMessages);
                
                // If this is a thread message, navigate to its parent message and open the thread
                if (threadParentMessageId) {
                    // Include both parent and thread message IDs in the URL
                    navigate(`/?message=${threadParentMessageId}&thread_message=${messageId}`, { replace: true });
                    // Find the parent message from the fetched messages
                    const parentMessage = channelMessages.find((m: Message) => String(m.id) === String(threadParentMessageId));
                    if (parentMessage) {
                        const tempThread: Thread = {
                            id: parentMessage.thread?.id || -1,
                            channel_id: Number(channelId),
                            parent_message_id: Number(threadParentMessageId),
                            created_at: parentMessage.created_at,
                            last_reply_at: parentMessage.thread?.last_reply_at || parentMessage.created_at,
                            thread_starter_content: parentMessage.content,
                            thread_starter_name: parentMessage.display_name,
                            thread_starter_id: parentMessage.user_id,
                            reply_count: parentMessage.thread?.reply_count || 0
                        };
                        // Send a message to open the thread
                        wsRef.current?.send(JSON.stringify({
                            type: 'thread_created',
                            thread: tempThread,
                            token: localStorage.getItem('token')
                        }));
                    }
                } else {
                    navigate(`/?message=${messageId}`, { replace: true });
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
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

    // Add typing indicator function
    const handleTyping = (isTyping: boolean) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: isTyping ? 'typing_start' : 'typing_stop',
                channelId: selectedChannelId,
                contextType: 'channel',
                token: localStorage.getItem('token')
            }));
        }
    };

    return (
        <div className="flex h-screen">
            <div className="flex h-screen w-screen">
                {/* Sidebar */}
                <div className="w-1/5 min-w-[250px] bg-gray-800 text-white flex flex-col justify-between flex-shrink-0">
                    <div className="flex flex-col flex-grow overflow-hidden">
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
                            wsRef={wsRef}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-700 bg-gray-800">
                        <div className="flex items-center justify-between">
                            <button className="hover:text-gray-400">⚙️</button>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button 
                                        className="hover:text-gray-400"
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    >
                                        👤
                                    </button>
                                    {users.map(user => {
                                        const token = localStorage.getItem('token');
                                        if (!token) return null;
                                        const currentUserId = jwtDecode<JWTPayload>(token).userId.toString();
                                        if (user.id === currentUserId) {
                                            return (
                                                <UserStatus 
                                                    key={user.id}
                                                    status={user.presence_status || 'offline'} 
                                                    customStatus={user.custom_status}
                                                    className="absolute bottom-0 right-0"
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                                <ProfileMenu wsRef={wsRef} isOpen={isProfileMenuOpen} setIsOpen={setIsProfileMenuOpen} />
                            </div>
                        </div>
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
                            onTyping={handleTyping}
                            wsRef={wsRef}
                            setMessages={setMessages}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainPage;