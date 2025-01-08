import React, { useState, useRef, useEffect } from 'react';

interface ProfileMenuProps {
    wsRef: React.RefObject<WebSocket>;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ wsRef, isOpen, setIsOpen }) => {
    const [customStatus, setCustomStatus] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, setIsOpen]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'set_custom_status',
                    status: customStatus,
                    token: localStorage.getItem('token')
                }));
                setCustomStatus('');
                setIsOpen(false);
            }
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-700 p-2 rounded shadow-lg">
                    <div className="relative">
                        <input
                            type="text"
                            value={customStatus}
                            onChange={(e) => setCustomStatus(e.target.value.slice(0, 40))}
                            onKeyDown={handleKeyDown}
                            placeholder="Set a status..."
                            className="bg-gray-600 text-white p-2 pr-8 rounded w-48"
                            maxLength={40}
                            autoFocus
                        />
                        <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${
                            40 - customStatus.length <= 5 ? 'text-red-400' :
                            40 - customStatus.length < 10 ? 'text-yellow-400' : 
                            'text-gray-400'
                        }`}>
                            {40 - customStatus.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileMenu; 