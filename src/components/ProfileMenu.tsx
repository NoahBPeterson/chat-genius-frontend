import React, { useState } from 'react';

interface ProfileMenuProps {
    wsRef: React.RefObject<WebSocket>;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ wsRef }) => {
    const [customStatus, setCustomStatus] = useState('');

    const updateCustomStatus = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'update_status',
                customStatus,
                token: localStorage.getItem('token')
            }));
        }
    };

    return (
        <div className="p-4">
            <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="Set a status..."
                className="w-full p-2 rounded"
            />
            <button 
                onClick={updateCustomStatus}
                className="mt-2 bg-purple-600 px-4 py-2 rounded"
            >
                Update Status
            </button>
        </div>
    );
};

export default ProfileMenu; 