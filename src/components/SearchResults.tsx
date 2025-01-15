import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Message } from '../types/Types';

interface SearchResultsProps {
    messages: Message[];
    channelName?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ messages }) => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    console.log('messages', messages);

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="sticky top-0 z-10 p-4 bg-purple-700">
                <h2 className="text-lg font-semibold text-white">
                    Search Results: "{query}"
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-purple-800">
                <ul className="space-y-2">
                    {messages.map((message) => (
                        <li
                            key={message.id}
                            className="p-2 bg-purple-700 rounded text-white"
                        >
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-purple-300">
                                        {message.display_name}
                                    </span>
                                    <span className="text-xs text-purple-400">
                                        {new Date(message.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="mt-1 break-all whitespace-pre-wrap">
                                    {message.content}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default SearchResults; 