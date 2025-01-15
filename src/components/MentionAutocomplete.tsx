import React, { useState, useEffect } from 'react';
import { User } from '../types/Types';

interface MentionAutocompleteProps {
    users: User[];
    searchTerm: string;
    onSelect: (user: User | null) => void;
    position: { bottom: number; left: number };
    visible: boolean;
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
    users,
    searchTerm,
    onSelect,
    position,
    visible
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredUsers = users.filter(user => 
        (user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        // Reset selection when search term changes
        setSelectedIndex(0);
    }, [searchTerm]);

    useEffect(() => {
        if (!visible) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!visible || filteredUsers.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedIndex(prev => 
                        prev > 0 ? prev - 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedIndex(prev => 
                        prev < filteredUsers.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'Enter':
                case 'Tab':
                    if (filteredUsers[selectedIndex]) {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(filteredUsers[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(null);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [visible, filteredUsers, selectedIndex, onSelect]);

    if (!visible || filteredUsers.length === 0) return null;

    return (
        <div 
            className="absolute z-50 bg-gray-800 rounded-md shadow-lg border border-gray-700 max-h-48 overflow-y-auto flex flex-col-reverse"
            style={{ 
                bottom: position.bottom,
                left: position.left,
                minWidth: '200px'
            }}
        >
            <div className="flex flex-col-reverse">
                {filteredUsers.map((user, index) => (
                    <button
                        key={user.id}
                        className={`w-full text-left px-4 py-2 hover:bg-purple-700 flex items-center gap-2
                            ${index === selectedIndex ? 'bg-purple-700' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect(user);
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                    >
                        <span className="text-gray-300">👤</span>
                        <div className="flex flex-col">
                            <span className="text-white">
                                {user.display_name || user.email}
                            </span>
                            {user.custom_status && (
                                <span className="text-sm text-gray-400">
                                    {user.custom_status}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MentionAutocomplete; 