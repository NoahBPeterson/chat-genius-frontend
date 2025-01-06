import React from 'react';
import { useParams } from 'react-router-dom';

const DMs: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            <h1>Direct Message ID: {id}</h1>
        </div>
    );
};

export default DMs;
