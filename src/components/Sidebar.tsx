import { jwtDecode } from 'jwt-decode';
import React from 'react';
import { User, JWTPayload } from '../types/Types';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    channels: any[];
    users: User[];
    onChannelSelect: (channelId: string) => void;
    onUserSelect: (userId: string) => void;
    setIsDM: (isDM: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    channels, 
    users, 
    onChannelSelect, 
    onUserSelect,
    setIsDM 
}) => {
    const navigate = useNavigate();
    const handleChannelClick = (channelId: string) => {
        setIsDM(false);
        onChannelSelect(channelId);
    };

    return (
        <>
            <h1 className="text-4xl font-bold text-center py-6">ChatGenius</h1>
            <hr className="border-2 border-gray-900" />
            <div className="sidebar flex-1 overflow-y-auto p-4 flex-shrink-0">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Channels</h2>
                    <ul className="space-y-1">
                        {channels.map(channel => (
                            <li key={channel.id}>
                                <button 
                                    onClick={() => {
                                        console.log('Clicking channel:', channel.id);
                                        handleChannelClick(channel.id);
                                    }}
                                    className="w-full text-left px-2 py-1 hover:bg-purple-700 rounded"
                                >
                                    #{channel.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <hr className="border-2 border-gray-900" />
            <div className="sidebar flex-1 overflow-y-auto p-4 flex-shrink-0">
                <h2 className="text-lg font-semibold mb-2">Direct Messages</h2>
                <ul className="space-y-1">
                    {(() => {
                        const token = localStorage.getItem('token') as string;
                        if (!token) {
                            navigate('/login');
                            return null;
                        }
                        const currentUserId = jwtDecode<JWTPayload>(token)?.userId;
                        console.log('Current user ID:', currentUserId);
                        console.log('All users:', users.map(u => ({ id: u.id, name: u.display_name })));
                        return users.filter(user => {
                            return Number(user.id) !== currentUserId;
                        }).map(user => (
                            <li key={user.id}>
                                <button 
                                    onClick={() => onUserSelect(user.id)}
                                    className="w-full text-left px-2 py-1 hover:bg-purple-700 rounded flex items-center"
                                >
                                    <span className="mr-2">👤</span>
                                    {user?.display_name ?? user?.email ?? "Unknown User"}
                                </button>
                            </li>
                        ));
                    })()}
                </ul>
            </div>
        </>
    );
};

export default Sidebar; 