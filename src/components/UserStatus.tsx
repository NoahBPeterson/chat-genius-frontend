import React from 'react';

interface UserStatusProps {
    status: 'online' | 'idle' | 'offline';
    customStatus?: string;
    isTyping?: boolean;
    className?: string;
}

const UserStatus: React.FC<UserStatusProps> = ({ status, customStatus, isTyping, className = '' }) => {
    const statusColors = {
        online: 'bg-green-500',
        idle: 'bg-yellow-500',
        offline: 'bg-gray-500'
    };

    return (
        <div className={`relative group ${className}`}>
            <div 
                className={`absolute bottom-0 right-0 w-2 h-2 ${statusColors[status]} rounded-full border-2 border-purple-800`} 
            />
            {(customStatus || isTyping) && (
                <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {isTyping ? 'Typing...' : customStatus}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserStatus; 