import React from 'react';
import { useParams } from 'react-router-dom';

const Threads: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            <h1>Thread ID: {id}</h1>
        </div>
    );
};

export default Threads;
