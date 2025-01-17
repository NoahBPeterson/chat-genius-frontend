import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductivitySettings } from '../types/Types';

interface SettingsMenuProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    wsRef: React.RefObject<WebSocket>;
    setToken?: (token: string | null) => void;
    settings: ProductivitySettings;
    onSettingsChange: (settings: ProductivitySettings) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
    isOpen, 
    setIsOpen, 
    wsRef, 
    setToken,
    settings,
    onSettingsChange
}) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        wsRef.current?.close();
        localStorage.removeItem('token');
        if (setToken) {
            setToken(null);
        }
        navigate('/');
        setIsOpen(false);
    };

    const updateSettings = async (updates: Partial<ProductivitySettings>) => {
        const newSettings = { ...settings, ...updates };
        
        // If tracking is disabled, ensure captures are disabled
        if (!newSettings.tracking_enabled) {
            newSettings.screen_capture_enabled = false;
            newSettings.webcam_capture_enabled = false;
        }

        // Only request webcam permission if that setting is being changed
        if ('webcam_capture_enabled' in updates && updates.webcam_capture_enabled) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
            } catch (error) {
                console.error('Webcam permission denied:', error);
                newSettings.webcam_capture_enabled = false;
            }
        }
        
        // Send to server
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'update_productivity_settings',
                token: localStorage.getItem('token'),
                settings: newSettings
            }));
        }
        onSettingsChange(newSettings);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-full left-0 mb-2 w-72 rounded-md shadow-lg bg-purple-900 ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu" aria-orientation="vertical">
                {/* Productivity Settings Section */}
                <div className="px-4 py-2 border-b border-purple-800">
                    <h3 className="text-sm font-medium text-white mb-2">Productivity Features</h3>
                    
                    {/* Main Toggle */}
                    <label className="flex items-center justify-between mb-3 cursor-pointer">
                        <span className="text-sm text-white flex items-center gap-2">
                            <span>🎯</span> Enable Productivity Tracking
                        </span>
                        <input
                            type="checkbox"
                            checked={settings.tracking_enabled}
                            onChange={(e) => updateSettings({ tracking_enabled: e.target.checked })}
                            className="form-checkbox h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                    </label>

                    {settings.tracking_enabled && (
                        <>
                            {/* Screen Capture Toggle */}
                            <label className="flex items-center justify-between mb-2 cursor-pointer pl-4">
                                <span className="text-sm text-gray-300 flex items-center gap-2">
                                    <span>🖥️</span> Allow Screen Capture
                                </span>
                                <input
                                    type="checkbox"
                                    checked={settings.screen_capture_enabled}
                                    onChange={(e) => updateSettings({ screen_capture_enabled: e.target.checked })}
                                    className="form-checkbox h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                />
                            </label>

                            {/* Webcam Capture Toggle */}
                            <label className="flex items-center justify-between mb-2 cursor-pointer pl-4">
                                <span className="text-sm text-gray-300 flex items-center gap-2">
                                    <span>📸</span> Allow Webcam Capture
                                </span>
                                <input
                                    type="checkbox"
                                    checked={settings.webcam_capture_enabled}
                                    onChange={(e) => updateSettings({ webcam_capture_enabled: e.target.checked })}
                                    className="form-checkbox h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                />
                            </label>

                            {/* Break Interval Setting */}
                            <div className="flex items-center justify-between mb-2 pl-4">
                                <span className="text-sm text-gray-300 flex items-center gap-2">
                                    <span>⏰</span> Break Interval
                                </span>
                                <select
                                    value={settings.break_reminder_interval}
                                    onChange={(e) => updateSettings({ break_reminder_interval: Number(e.target.value) })}
                                    className="bg-purple-800 border border-purple-700 rounded px-2 py-1 text-sm text-white"
                                >
                                    <option value={900}>15 min</option>
                                    <option value={1800}>30 min</option>
                                    <option value={2700}>45 min</option>
                                    <option value={3600}>60 min</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* Logout Button */}
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