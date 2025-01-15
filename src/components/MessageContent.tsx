import React, { useState, useEffect } from 'react';
import { Message, User } from '../types/Types';
import API_Client from '../API_Client';

interface MessageContentProps {
    message: Message;
    users?: User[];
}

const MessageContent: React.FC<MessageContentProps> = ({ message, users = [] }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const fileMatch = message.content.match(/\[File: (.*?)\]\((.*?)\)/);

    // Handle file attachments
    useEffect(() => {
        if (fileMatch) {
            const [, , storagePath] = fileMatch;
            const fetchFileUrl = async () => {
                try {
                    const response = await API_Client.get(`/api/files/${encodeURIComponent(storagePath)}`);
                    if (response.status === 200) {
                        setFileUrl(response.data.url);
                    }
                } catch (error) {
                    console.error('Error fetching file URL:', error);
                }
            };
            fetchFileUrl();
        }
    }, [message.content, fileMatch]);

    // Handle mentions
    const parts = message.content.split(/(@[^\s]+)/g).map((part, index) => {
        if (part.startsWith('@')) {
            const username = part.slice(1);
            const mentionedUser = users.find(user => 
                user.email === username || user.display_name === username
            );
            
            if (mentionedUser) {
                return (
                    <span key={index} className="bg-yellow-500/30 px-1 rounded font-bold">
                        {part}
                    </span>
                );
            }
        }
        return part;
    });

    // Render file attachment if present
    if (fileMatch && fileUrl) {
        const [, filename] = fileMatch;
        return (
            <div>
                <div>{parts}</div>
                <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 inline-block bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded"
                >
                    📎 Download {filename}
                </a>
            </div>
        );
    }

    // Regular message content
    return <span>{parts}</span>;
};

export default MessageContent; 