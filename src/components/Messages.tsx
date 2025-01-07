import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types/Types';

interface MessagesProps {
    channelId: string;
    channelName?: string;
    isDM: boolean;
    messages: Message[];
    onSendMessage: (content: string) => void;
}

const Messages: React.FC<MessagesProps> = ({ 
    channelId, 
    channelName, 
    isDM,
    messages,
    onSendMessage 
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
                    <div ref={messagesEndRef} />
                </ul>
            </div>

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
        </div>
    );    
};

export default Messages;