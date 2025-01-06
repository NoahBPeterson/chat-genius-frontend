import React, { useEffect, useState } from 'react';
import API_Client from '../API_Client';

const Messages: React.FC<{ channelId: string }> = ({ channelId }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await API_Client.get(`/api/channels/${channelId}/messages`);
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
    }, [channelId]);

    const handleSendMessage = async (message: string) => {
        if (message.trim()) {
            try {
                const response = await API_Client.post(`/api/channels/${channelId}/messages`, {
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
    messages.map((message, index) => {
        console.log(message, index);
    })
    return (
        <div className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 bg-purple-1000">
                    <h2 className="text-lg font-semibold mb-2">Messages</h2>
                    <ul className="space-y-2">
                        {messages.map((message) => (
                            <li
                                key={message.id}
                                className="p-2 bg-purple-900 rounded text-white"
                            >
                                {message.content}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-purple-600 bg-purple-800">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyUp={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage(newMessage);
                                setNewMessage('');
                            }
                        }}
                        placeholder="Type your message..."
                        className="w-full p-2 border rounded"
                    />
                </div>
        </div>
    );
};

export default Messages; 