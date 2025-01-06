import React from 'react';
import { useParams } from 'react-router-dom';

const Channels: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            <h1>Channel ID: {id}</h1>
        </div>
    );
};

export default Channels;
