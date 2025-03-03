import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Messages, { MessagesRef } from './Messages';
import API_Client from '../API_Client';
import { jwtDecode } from "jwt-decode";
import { Message, JWTPayload, User, Thread, Channel } from '../types/Types';
import SearchBar, { SearchBarRef } from './SearchBar';
import ProfileMenu from './ProfileMenu';
import UserStatus from './UserStatus';
import { AxiosError } from 'axios';
import SettingsMenu from './SettingsMenu';
import { ProductivitySettings } from '../types/Types';
import ProductivityTracker from './ProductivityTracker';

// Add a special channel ID for search results
const SEARCH_CHANNEL_ID: number = -9;

interface MainPageProps {
    setToken: (token: string | null) => void;
}

const MainPage: React.FC<MainPageProps> = ({ setToken }) => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<number>(1);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [isDM, setIsDM] = useState(false);
    const [newChannelName, setNewChannelName] = useState<string>('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isInputVisible, setIsInputVisible] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const currentChannelRef = useRef<number>(1);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const messagesRef = useRef<MessagesRef>(null);
    const searchBarRef = useRef<SearchBarRef>(null);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [productivitySettings, setProductivitySettings] = useState<ProductivitySettings>({
        tracking_enabled: false,
        screen_capture_enabled: false,
        webcam_capture_enabled: false,
        break_reminder_interval: 1800
    });
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // Add this function to fetch messages via REST API
    const fetchMessages = useCallback(async (channelId: number) => {
        try {
            const response = await API_Client.get(`/api/channels/${channelId}/messages`);
            if (response.status === 200) {
                setMessages(response.data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }, []);

    const fetchChannels = useCallback(async () => {
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
        }
    }, [fetchMessages]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await API_Client.get('/api/users');
            if (response.status === 200) {
                setUsers(response.data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, []);

    useEffect(() => {
        const initializeData = async () => {
            try {
                await fetchChannels();
                await fetchUsers();
            } catch (error) {
                console.error('Error initializing data:', error);
            }
        };

        initializeData();
    }, [fetchChannels, fetchUsers]);

    useEffect(() => {
        const handleTokenError = () => {
            localStorage.removeItem('token');
            navigate('/login');
        };

        const token = localStorage.getItem('token');
        if (!token) {
            handleTokenError();
            return;
        }

        try {
            const decoded = jwtDecode<JWTPayload>(token);
            setUserRole(decoded.role);
        } catch (error) {
            console.error('Invalid token:', error);
            handleTokenError();
        }
    }, [navigate]);

    // Update the ref whenever selectedChannelId changes
    useEffect(() => {
        currentChannelRef.current = selectedChannelId;
    }, [selectedChannelId]);

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

            const baseUrl = `${window.location.host}`;
            if (baseUrl.includes('localhost')) {
                wsRef.current = new WebSocket('ws://localhost:8080');
            } else {
                wsRef.current = new WebSocket(`wss://${baseUrl}/ws`);
            }

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'authenticate',
                        token: localStorage.getItem('token')
                    }));
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
                        console.log('Authentication successful');
                        break;
                    case 'message_updated':
                        if (data.message.channel_id === selectedChannelId) {
                            setMessages(prev => prev.map(msg => 
                                msg.id === data.message.id ? data.message : msg
                            ));
                        }
                        break;
                    case 'new_message':
                        {
                            const messageChannelStr = Number(data.message.channel_id);
                            const selectedChannelStr = Number(currentChannelRef.current);
                            // Don't add messages for search results view
                            if (currentChannelRef.current !== SEARCH_CHANNEL_ID && 
                                messageChannelStr === selectedChannelStr) {
                                setMessages(prev => {
                                    const messageExists = prev.some(msg => msg.id === data.message.id);
                                    if (messageExists) {
                                        return prev;
                                    }
                                    return [...prev, data.message];
                                });
                            } else {
                                console.log('Skipping message - channel mismatch or search view');
                            }
                        }
                        break;
                    case 'user_joined':
                        // Add the new user to the users list if they're not already there
                        setUsers(prev => {
                            const userExists = prev.some(u => u.id === data.user.id);
                            if (userExists) {
                                return prev;
                            }
                            return [...prev, data.user];
                        });
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
                    case 'bulk_presence_update':
                        setUsers(prevUsers => {
                            const updatedUsers = prevUsers.map(user => {
                                const presence = data.presenceData.find(
                                    (p: { 
                                        id: number,
                                        presence_status: string,
                                        status_message: string,
                                        emoji: string
                                    }) => p.id === user.id);
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
                                                reply_count: 1
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
                            if (msg.id === data.thread.parent_message_id) {
                                return {
                                    ...msg,
                                    has_thread: true,
                                    thread: {
                                        ...(msg.thread || {}),
                                        id: data.thread.id,
                                        channel_id: data.thread.channel_id,
                                        parent_message_id: data.thread.parent_message_id,
                                        created_at: data.thread.created_at,
                                        last_reply_at: data.message.created_at,
                                        thread_starter_content: msg.content,
                                        thread_starter_name: msg.display_name,
                                        thread_starter_id: msg.user_id,
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
                    case 'settings_updated':
                        if (data.success) {
                            setProductivitySettings(prev => ({
                                ...prev,
                                ...data.settings
                            }));
                        }
                        break;
                    case 'request_users':
                        console.log('Received request_users:', data);
                        setUsers(data.users);
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
    }, [navigate, selectedChannelId]);

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
                setNewChannelName('');
                setIsInputVisible(false);
                await fetchChannels(); // Fetch updated channels list
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

    const handleUserSelect = async (userId: number) => {
        try {
            const response = await API_Client.post(`/api/dm/${userId}`);
            const channelId = response.data.id.toString();
            
            // Update the ref immediately
            currentChannelRef.current = channelId;
            
            // Clear messages first
            setMessages([]);
            
            // Update channel selection state
            setSelectedChannelId(channelId);
            setSelectedUserId(userId);
            setIsDM(true);
            
            // Remove search query from URL
            navigate('/', { replace: true });

            // Fetch messages for the new channel
            await fetchMessages(channelId);
            
            console.log('DM channel selected:', {
                channelId,
                userId,
                isDM: true
            });
        } catch (error) {
            console.error('Error setting up DM:', error);
        }
    };

    const handleChannelSelect = async (channelId: number) => {
        if (channelId === selectedChannelId) {
            // If we're already in this channel, just scroll to bottom
            const messagesContainer = document.querySelector('.overflow-y-auto');
            if (messagesContainer) {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
            messagesRef.current?.focus();
            return;
        }

        setSelectedChannelId(channelId);
        setIsDM(channels.find(c => c.id === channelId)?.is_dm || false);
        
        try {
            const response = await API_Client.get(`/api/channels/${channelId}/messages`);
            if (response.status === 200) {
                setMessages(response.data);
                // Focus the input after messages are loaded
                setTimeout(() => messagesRef.current?.focus(), 0);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            if ((error as AxiosError).response?.status === 401) {
                navigate('/login');
            }
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

    const handleMessageClick = async (channelId: number, messageId: number, threadParentMessageId?: number) => {
        setMessages([]); // Clear messages first
        
        const channel = channels.find(c => c.id === channelId);

        setSelectedChannelId(channelId);
        setIsDM(channel?.is_dm || false);
        
        // If it's a DM, set the selectedUserId
        if (channel?.is_dm) {
            const currentUserId = Number(jwtDecode<JWTPayload>(localStorage.getItem('token') as string).userId);
            const otherUserId = channel.dm_participants.find((id: number) => id !== currentUserId);
            setSelectedUserId(otherUserId || null);
        } else {
            setSelectedUserId(null);
        }
        
        try {
            // First fetch messages to ensure we have the thread data
            const response = await API_Client.get(`/api/channels/${channelId}/messages`);
            if (response.status === 200) {
                const channelMessages = response.data;
                setMessages(channelMessages);
                
                // Clear search bar when navigating to a message
                searchBarRef.current?.clear();
                
                // If this is a thread message or has a parent message ID, navigate to its parent message and open the thread
                const clickedMessage = channelMessages.find((m: Message) => String(m.id) === String(messageId));
                console.log('Full message details:', {
                    messageId,
                    threadParentMessageId,
                    clickedMessage,
                    channelMessages: channelMessages.map((m: Message) => m.id),
                    isMessageInChannel: channelMessages.some((m: Message) => String(m.id) === String(messageId))
                });
                
                // A message is a thread message if:
                // 1. It has a thread_id (it's a reply in a thread)
                // 2. It was passed a threadParentMessageId (from search results)
                // 3. It has a thread_parent_message_id (from search results)
                // 4. It's not found in the main channel messages (it must be a thread message)
                const isThreadMessage = clickedMessage?.thread_id !== undefined || 
                                     threadParentMessageId !== undefined ||
                                     clickedMessage?.thread_parent_message_id !== undefined ||
                                     !channelMessages.some((m: Message) => String(m.id) === String(messageId));
                
                // Get the parent message ID from either:
                // 1. The passed threadParentMessageId
                // 2. The clicked message's thread_parent_message_id (from search results)
                const parentMessageId = threadParentMessageId || 
                                      clickedMessage?.thread_parent_message_id || 
                                      clickedMessage?.thread_id;
                
                console.log('Thread info:', {
                    isThreadMessage,
                    parentMessageId,
                    channelId,
                    messageParentId: clickedMessage?.thread_parent_message_id
                });
                
                if (isThreadMessage && parentMessageId) {
                    console.log('Opening thread with:', {
                        parentMessageId,
                        messageId
                    });
                    // Include both parent and thread message IDs in the URL
                    navigate(`/?message=${parentMessageId}&thread_message=${messageId}`, { replace: true });
                    // Find the parent message from the fetched messages
                    const parentMessage = channelMessages.find((m: Message) => String(m.id) === String(parentMessageId));
                    console.log('Found parent message:', parentMessage);
                    
                    if (parentMessage) {
                        const tempThread: Thread = {
                            id: parentMessage.thread?.id || -1,
                            channel_id: Number(channelId),
                            parent_message_id: Number(parentMessageId),
                            created_at: parentMessage.created_at,
                            last_reply_at: parentMessage.thread?.last_reply_at || parentMessage.created_at,
                            thread_starter_content: parentMessage.content,
                            thread_starter_name: parentMessage.display_name,
                            thread_starter_id: parentMessage.user_id,
                            reply_count: parentMessage.thread?.reply_count || 0
                        };
                        console.log('Created temp thread:', tempThread);
                        // Send a message to open the thread
                        wsRef.current?.send(JSON.stringify({
                            type: 'thread_created',
                            thread: tempThread,
                            token: localStorage.getItem('token')
                        }));
                    } else {
                        console.log('Parent message not found in channel messages');
                    }
                } else {
                    console.log('Not a thread message, navigating to:', messageId);
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

    // Get current user ID for ProductivityTracker
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const userId = jwtDecode<JWTPayload>(token).userId;
            setCurrentUserId(userId);
        } else {
            setCurrentUserId(null);
        }
    }, []); // Only run once on mount

    return (
        <div className="flex h-screen">
            <div className="flex h-screen w-screen">
                {/* Add ProductivityTracker */}
                <ProductivityTracker 
                    wsRef={wsRef}
                    userId={currentUserId || 0}
                    settings={productivitySettings}
                />

                {/* Sidebar */}
                <div className="w-1/5 min-w-[250px] bg-gray-800 text-white flex flex-col justify-between flex-shrink-0">
                    <div className="flex flex-col flex-grow overflow-hidden">
                        <SearchBar ref={searchBarRef} onSearch={handleSearch} />
                        
                        {/* Admin Controls */}
                        {(userRole === 'member' || userRole === 'admin') && (
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
                                            className="w-full p-2 border rounded text-white bg-gray-700"
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
                            <div className="relative">
                                <button 
                                    className="hover:text-gray-400"
                                    onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                                >
                                    ⚙️
                                </button>
                                <SettingsMenu 
                                    isOpen={isSettingsMenuOpen} 
                                    setIsOpen={setIsSettingsMenuOpen}
                                    wsRef={wsRef}
                                    setToken={setToken}
                                    settings={productivitySettings}
                                    onSettingsChange={setProductivitySettings}
                                />
                            </div>
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
                                        const currentUserId = jwtDecode<JWTPayload>(token).userId;
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
                            ref={messagesRef}
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