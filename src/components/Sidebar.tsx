import { jwtDecode } from 'jwt-decode';
import React from 'react';

interface User {
    id: string;
    display_name: string;
    email: string;
}

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
    const handleChannelClick = (channelId: string) => {
        setIsDM(false);
        onChannelSelect(channelId);
    };
    console.log("THIS ONE", jwtDecode(localStorage.getItem('token') as string));
    console.log(channels);
    console.log(users);
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
                                    onClick={() => handleChannelClick(channel.id)}
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
                    {users.filter(user => Number(user.id) !== jwtDecode<{ userId: number, role: string, iat: number, exp: number }>(localStorage.getItem('token') as string).userId)
                        .map(user => (
                        <li key={user.id}>
                            <button 
                                onClick={() => onUserSelect(user.id)}
                                className="w-full text-left px-2 py-1 hover:bg-purple-700 rounded flex items-center"
                            >
                                <span className="mr-2">👤</span>
                                {user?.display_name ?? user?.email ?? "Unknown User"}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
};

export default Sidebar; 