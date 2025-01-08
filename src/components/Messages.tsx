import React, { useState, useRef, useEffect } from 'react';
import { Channel, Message } from '../types/Types';
import { jwtDecode } from 'jwt-decode';
import { User, JWTPayload } from '../types/Types';
import FileUpload from './FileUpload';
import API_Client from '../API_Client';

interface MessagesProps {
    channelId: string;
    channelName?: string;
    isDM: boolean;
    messages: Message[];
    onSendMessage: (content: string) => void;
    isSearchResults?: boolean;
    channels?: Channel[];
    users?: User[];
    onMessageClick?: (channelId: string, messageId: string) => void;
    onFileUpload: (storagePath: string, filename: string, size: number, mimeType: string) => void;
    onTyping: (isTyping: boolean) => void;
}

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const fileMatch = content.match(/\[File: (.*?)\]\((.*?)\)/);

    useEffect(() => {
        const fetchFileUrl = async () => {
            if (fileMatch) {
                try {
                    const response = await API_Client.get(`/api/files/${fileMatch[2]}`);
                    setFileUrl(response.data.downloadUrl);
                } catch (error) {
                    console.error('Error fetching file URL:', error);
                }
            }
        };

        fetchFileUrl();
    }, [content]);

    if (fileMatch) {
        const [, filename] = fileMatch;
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
        return isImage && fileUrl ? (
            <img 
                src={fileUrl}
                alt={filename}
                className="max-w-md max-h-60 rounded-lg cursor-pointer hover:opacity-90"
            />
        ) : (
            <a 
                href={fileUrl || '#'}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 underline"
            >
                📎 {filename}
            </a>
        );
    }

    return <span>{content}</span>;
};

const Messages: React.FC<MessagesProps> = ({ 
    channelId, 
    channelName, 
    isDM,
    messages,
    onSendMessage,
    isSearchResults = false,
    channels = [],
    users = [],
    onMessageClick,
    onFileUpload,
    onTyping
}) => {
    const [newMessage, setNewMessage] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const highlightedMessageId = useRef<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    const scrollToBottom = () => {
        if (highlightedMessageId.current) return;
        messagesContainerRef.current?.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: "auto"
        });
    };

    const scrollToMessage = (messageId: string) => {
        highlightedMessageId.current = messageId;
        setTimeout(() => {
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement && messagesContainerRef.current) {
                const containerRect = messagesContainerRef.current.getBoundingClientRect();
                const messageRect = messageElement.getBoundingClientRect();
                const scrollTop = messageRect.top - containerRect.top - (containerRect.height / 2) + messagesContainerRef.current.scrollTop;
                
                messagesContainerRef.current.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
                
                messageElement.classList.remove('bg-purple-700');
                messageElement.classList.add('bg-purple-400');
                
                setTimeout(() => {
                    messageElement.classList.remove('bg-purple-400');
                    messageElement.classList.add('bg-purple-700');
                    highlightedMessageId.current = null;
                }, 2000);
            }
        }, 100);
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
        const urlParams = new URLSearchParams(window.location.search);
        const messageId = urlParams.get('message');
        console.log("messageId MESSAGES", messageId);
        if (messageId) {
            scrollToMessage(messageId);
        } else {
            scrollToBottom();
        }
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Send typing started
        onTyping(true);

        // Set timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            onTyping(false);
        }, 1000);
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

            <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 bg-purple-800"
            >
                <ul className="space-y-2">
                    {messages.map((message) => (
                        <li
                            key={message.id}
                            id={`message-${message.id}`}
                            onClick={() => {
                                if (isSearchResults && onMessageClick) {
                                    onMessageClick(message.channel_id.toString(), message.id.toString());
                                }
                            }}
                            className={`p-2 rounded text-white transition-all duration-300 ease-in-out
                                ${isSearchResults ? 'cursor-pointer hover:bg-purple-600' : ''}
                                bg-purple-700 hover:bg-purple-600`}
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
                                    <MessageContent content={message.content} />
                                </div>
                            </div>
                        </li>
                    ))}
                    <div ref={messagesEndRef} />
                </ul>
                {users.map(user => 
                    user.is_typing?.[channelId] && (
                        <div key={`typing-${user.id}`} className="text-sm text-gray-400 italic">
                            {user.display_name} is typing...
                        </div>
                    )
                )}
            </div>

            {!isSearchResults && (
                <div className="p-4 border-t border-purple-700 bg-purple-900">
                    <div className="flex items-center gap-2">
                        <FileUpload onUploadComplete={onFileUpload} />
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleInputChange}
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
            )}
        </div>
    );    
};

export default Messages;