import React, { useState, useRef, useEffect } from 'react';
import { Channel, Message } from '../types/Types';
import { jwtDecode } from 'jwt-decode';
import { User, JWTPayload } from '../types/Types';

interface MessagesProps {
    channelId: string;
    channelName?: string;
    isDM: boolean;
    messages: Message[];
    onSendMessage: (content: string) => void;
    isSearchResults?: boolean;
    channels?: Channel[];
    users?: User[];
}

const Messages: React.FC<MessagesProps> = ({ 
    channelId, 
    channelName, 
    isDM,
    messages,
    onSendMessage,
    isSearchResults = false,
    channels = [],
    users = []
}) => {
    const [newMessage, setNewMessage] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
            scrollToBottom();
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getChannelName = (channelId: string) => {
        const channel = channels.find(c => c.id == channelId);
        if (!channel) return 'Unknown Channel';

        if (channel.is_dm) {
            const currentUserId = Number(jwtDecode<JWTPayload>(localStorage.getItem('token') as string).userId);
            const otherUserId = channel.dm_participants.find((id: number) => id !== currentUserId);
            
            const otherUser = users.find(u => Number(u.id) === otherUserId);
            return otherUser?.display_name ?? otherUser?.email ?? 'Unknown User';
        }

        return channel.name;
    };

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="sticky top-0 z-10 p-4 bg-purple-700">
                <h2 className="text-lg font-semibold text-white">
                    {isSearchResults ? (
                        <span>🔍 {channelName}</span>
                    ) : isDM ? (
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
                                {isSearchResults && (
                                    <div className="text-sm text-purple-400 mb-1">
                                        in {channels.find(c => Number(c.id) == message.channel_id)?.is_dm ? 
                                            `DM: ${getChannelName(message.channel_id.toString())}` : 
                                            `#${channels.find(c => Number(c.id) == message.channel_id)?.name || 'Unknown Channel'}`}
                                    </div>
                                )}
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-purple-300">
                                        {message.display_name}
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
            </div>

            {!isSearchResults && (
                <div className="p-4 border-t border-purple-700 bg-purple-900">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.repeat) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Type your message..."
                        className="w-full p-2 border rounded bg-purple-700 text-white placeholder-gray-400"
                    />
                </div>
            )}
        </div>
    );    
};

export default Messages;