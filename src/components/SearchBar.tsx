import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';

interface SearchBarProps {
    onSearch: (query: string) => void;
}

export interface SearchBarRef {
    clear: () => void;
}

const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(({ onSearch }, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        clear: () => {
            setSearchQuery('');
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch(searchQuery.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-700">
            <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full p-2 rounded bg-purple-900 text-white placeholder-gray-400"
            />
        </form>
    );
});

export default SearchBar; 