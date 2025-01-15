import React from 'react';
import { User } from '../types/Types';

interface AvatarResponseProps {
    content: string;
    user: User;
    timestamp: string;
}

const AvatarResponse: React.FC<AvatarResponseProps> = ({
    content,
    user,
    timestamp
}) => {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-900 to-purple-800 border border-purple-600">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center">
                <span className="text-lg">🤖</span>
            </div>
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-purple-300">AI Avatar for {user.display_name || user.email}</span>
                    <span className="text-xs text-gray-400">{timestamp}</span>
                </div>
                <div className="text-white whitespace-pre-wrap">{content}</div>
            </div>
        </div>
    );
};

export default AvatarResponse; 