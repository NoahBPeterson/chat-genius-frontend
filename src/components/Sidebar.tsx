import React from 'react';

const Sidebar: React.FC<{ channels: any[]; setSelectedChannelId: (id: string) => void }> = ({ channels, setSelectedChannelId }) => {
    return (
        <div className="sidebar">
            <h2>Channels</h2>
            <ul>
                {channels.map(channel => (
                    <li key={channel.id}>
                        <button 
                            onClick={() => setSelectedChannelId(channel.id)} 
                            className="channel-button"
                        >
                            {channel.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar; 