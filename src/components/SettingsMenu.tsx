import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SettingsMenuProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    wsRef: React.RefObject<WebSocket>;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, setIsOpen, wsRef }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Close WebSocket connection
        if (wsRef.current) {
            wsRef.current.close();
        }
        // Remove token
        localStorage.removeItem('token');
        // Navigate to landing page
        navigate('/');
        // Close menu
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-full left-0 mb-2 w-48 rounded-md shadow-lg bg-purple-900 ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu" aria-orientation="vertical">
                <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-purple-800 flex items-center gap-2"
                    role="menuitem"
                >
                    <span>🚪</span> Logout
                </button>
            </div>
        </div>
    );
};

export default SettingsMenu; 