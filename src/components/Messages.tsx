import React, { useEffect, useState, useRef } from 'react';
import API_Client from '../API_Client';

interface MessagesProps {
    channelId: string;
    channelName?: string;
    isDM?: boolean;
}

const Messages: React.FC<MessagesProps> = ({ channelId, channelName, isDM = false }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [currentChannelId, setCurrentChannelId] = useState(channelId);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                if (isDM) {
                    // Create or get DM channel first
                    setCurrentChannelId((await API_Client.post(`/api/dm/${channelId}`)).data.id);
                }
                const response = await API_Client.get(`/api/channels/${currentChannelId}/messages`);
                if (response.status === 200) {
                    setMessages(response.data);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [channelId, isDM]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, channelId]);

    const handleSendMessage = async (message: string) => {
        if (message.trim()) {
            try {
                const response = await API_Client.post(`/api/channels/${currentChannelId}/messages`, {
                    content: message
                });
                if (response.status === 201) {
                    setMessages([...messages, response.data]);
                    setNewMessage('');
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    if (loading) return <div>Loading messages...</div>;
    
    return (
        <div className="flex flex-col h-screen w-full">
            {/* Fixed Header */}
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

            {/* Messages Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-purple-800">
                <ul className="space-y-2">
                    {messages.map((message) => (
                        <li
                            key={message.id}
                            className="p-2 bg-purple-700 rounded text-white"
                        >
                            {message.content}
                        </li>
                    ))}
                </ul>
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
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