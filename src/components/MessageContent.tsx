import React, { useState, useEffect } from 'react';
import API_Client from '../API_Client';

interface MessageContentProps {
    content: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
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

export default MessageContent; 