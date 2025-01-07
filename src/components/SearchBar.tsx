import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
    onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setIsLoading(true);
            try {
                await onSearch(query);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="px-4 py-2">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isLoading ? "Searching..." : "Search messages..."}
                disabled={isLoading}
                className="w-full p-2 rounded bg-purple-700 text-white placeholder-purple-300 
                         border border-purple-600 focus:outline-none focus:border-purple-500
                         disabled:opacity-75"
            />
        </form>
    );
};

export default SearchBar; 