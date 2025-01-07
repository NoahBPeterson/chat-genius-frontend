import React from 'react';

interface User {
    id: string;
    displayname: string;
    email: string;
}

interface SidebarProps {
    channels: any[];
    users: User[];
    setSelectedChannelId: (id: string) => void;
    setIsDM: (isDM: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ channels, users, setSelectedChannelId, setIsDM }) => {
    const handleChannelClick = (channelId: string) => {
        setIsDM(false);
        setSelectedChannelId(channelId);
    };

    const handleUserClick = (userId: string) => {
        setIsDM(true);
        setSelectedChannelId(userId);
    };

    return (
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

            <div>
                <h2 className="text-lg font-semibold mb-2">Direct Messages</h2>
                <ul className="space-y-1">
                    {users.map(user => (
                        <li key={user.id}>
                            <button 
                                onClick={() => handleUserClick(user.id)}
                                className="w-full text-left px-2 py-1 hover:bg-purple-700 rounded flex items-center"
                            >
                                <span className="mr-2">👤</span>
                                {user.displayname}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Sidebar; 