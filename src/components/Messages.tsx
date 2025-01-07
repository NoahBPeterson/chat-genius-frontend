import React, { useEffect, useState, useRef } from 'react';
import API_Client from '../API_Client';

interface MessagesProps {
    channelId: string;
    channelName?: string;
    isDM?: boolean;
}

interface Message {
    id: number;
    channel_id: number;
    user_id: number;
    content: string;
    created_at: string;
    timestamp: string;
    author_name: string;
}

interface User {
    id: number;
    email: string;
    displayname: string;
}

const Messages: React.FC<MessagesProps> = ({ channelId, channelName, isDM = false }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [newMessage, setNewMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch users when component mounts
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await API_Client.get('/api/users');
                if (response.status === 200) {
                    setUsers(response.data);
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, []);

    // Helper function to get author name
    const getAuthorName = (userId: number) => {
        const user = users.find(u => u.id === userId);
        return user ? (user.email ?? user.displayname) : 'Unknown User';
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                let messageChannelId = channelId;
                
                if (isDM) {
                    const response = await API_Client.post(`/api/dm/${channelId}`);
                    messageChannelId = response.data.id;
                    console.log(`DM channel created/found: ${messageChannelId} for user ${channelId}`);
                }
                
                const messagesResponse = await API_Client.get(`/api/channels/${messageChannelId}/messages`);
                if (messagesResponse.status === 200) {
                    console.log(`Fetching messages for channel ${messageChannelId}`);
                    setMessages(messagesResponse.data);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setLoading(false);
            }
        };

        setLoading(true);
        fetchMessages();
    }, [channelId, isDM]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, channelId]);

    const handleSendMessage = async (content: string) => {
        try {
            let messageChannelId = channelId;
            
            if (isDM) {
                // Ensure DM channel exists before sending
                const response = await API_Client.post(`/api/dm/${channelId}`);
                messageChannelId = response.data.id;
            }

            const response = await API_Client.post(`/api/channels/${messageChannelId}/messages`, {
                content: content
            });

            console.log('Send message response:', response.data);

            if (response.status === 201) {
                // Add the new message to the list
                setMessages(prev => [...prev, response.data]);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    if (loading) return <div>Loading messages...</div>;

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="sticky top-0 z-10 p-4 bg-purple-700">
                <h2 className="text-lg font-semibold text-white">
                    {isDM ? (
                        <span>
                            <span className="mr-2">👤</span>
                            {channelName}
                        </span>
                    ) : (
                        <span>#{channelName || channelId}</span>
                    )}
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-purple-800">
                <ul className="space-y-2">
                    {messages.map((message) => (
                        <li
                            key={message.id}
                            className="p-2 bg-purple-700 rounded text-white"
                        >
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-purple-300">
                                        {getAuthorName(message.user_id)}
                                    </span>
                                    <span className="text-xs text-purple-400">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="mt-1 break-all whitespace-pre-wrap">
                                    {message.content}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-purple-700 bg-purple-900">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.repeat) {
                            e.preventDefault();
                            if (newMessage.trim()) {
                                handleSendMessage(newMessage);
                                setNewMessage('');
                            }
                        }
                    }}
                    placeholder="Type your message..."
                    className="w-full p-2 border rounded bg-purple-700 text-white placeholder-gray-400"
                />
            </div>
        </div>
    );    
};  
export default Messages;