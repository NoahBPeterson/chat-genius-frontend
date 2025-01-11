import React, { useState, useEffect } from 'react';
import { Message } from '../types/Types';
import MessageReactions from './MessageReactions';
import API_Client from '../API_Client';

interface MessageContentProps {
    message: Message;
    wsRef: React.RefObject<WebSocket>;
}

const MessageContent: React.FC<MessageContentProps> = ({ message, wsRef }) => {
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
    
    return (
        <div className="flex flex-col">
            {fileMatch ? (
                <div className="mb-2">
                    {(() => {
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
                    })()}
                </div>
            ) : (
                <span>{message.content}</span>
            )}
            <MessageReactions
                messageId={message.id}
                reactions={message.reactions || {}}
                wsRef={wsRef}
            />
        </div>
    );
};

export default MessageContent; 