import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API_Client from '../API_Client';

const Channels: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [channel, setChannel] = useState<any>(null);
    const [allChannels, setAllChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const token = localStorage.getItem('token');
                const channelResponse = await API_Client.get(`/api/channels/${id}`, {
                    headers: {
                        'Authorization': `${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (channelResponse.status !== 200) {
                    throw new Error(`HTTP error! status: ${channelResponse.status}`);
                }
                const channelData = await channelResponse.data;
                setChannel(channelData);

                const allChannelsResponse = await API_Client.get('/api/channels', {
                    headers: {
                        'Authorization': `${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (allChannelsResponse.status !== 200) {
                    throw new Error(`HTTP error! status: ${allChannelsResponse.status}`);
                }
                const allChannelsData = await allChannelsResponse.data;
                setAllChannels(allChannelsData);
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('Failed to fetch channel or server data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchChannels();
    }, [id]);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h1>Current Channel: {channel?.name || id}</h1>
            <h2>Channels:</h2>
            <ul>
                {allChannels.map(channel => (
                    <li key={channel.id}>{channel.name}</li>
                ))}
            </ul>
            {/* Add more channel details here as needed */}
        </div>
    );
};

export default Channels;
