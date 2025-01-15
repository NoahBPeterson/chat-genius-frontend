import React, { useState, useEffect } from 'react';
import { Message, User } from '../types/Types';
import MessageReactions from './MessageReactions';
import API_Client from '../API_Client';

interface MessageContentProps {
    message: Message;
    wsRef: React.RefObject<WebSocket>;
    users?: User[];
}

const MessageContent: React.FC<MessageContentProps> = ({ message, wsRef, users = [] }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    
    if (!message) return null;

    const fileMatch = message.content.match(/\[File: (.*?)\]\((.*?)\)/);

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
    }, [message.content]);

    const renderContent = () => {
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

        // Split content by @ symbol and process mentions
        const parts = message.content.split(/(@[^\s]+)/g);
        return (
            <span>
                {parts.map((part, index) => {
                    if (part.startsWith('@')) {
                        const userEmail = part.slice(1); // Remove @ symbol
                        const mentionedUser = users.find(user => 
                            user.email === userEmail || 
                            user.display_name === userEmail
                        );
                        if (mentionedUser) {
                            return (
                                <span key={index} className="bg-blue-900/30 text-white font-semibold px-0.5 rounded">
                                    {part}
                                </span>
                            );
                        }
                    }
                    return <span key={index}>{part}</span>;
                })}
            </span>
        );
    };
    
    return (
        <div className="flex flex-col">
            {renderContent()}
            <MessageReactions
                messageId={message.id}
                reactions={Array.isArray(message.reactions) ? message.reactions.reduce((acc, reaction) => ({
                    ...acc,
                    [reaction.emoji]: {
                        count: reaction.count,
                        users: reaction.users
                    }
                }), {}) : {}}
                wsRef={wsRef}
            />
        </div>
    );
};

export default MessageContent; 