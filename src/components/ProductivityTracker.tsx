import React, { useEffect, useRef, useState } from 'react';
import { ProductivitySettings } from '../types/Types';

interface ProductivityTrackerProps {
    wsRef: React.RefObject<WebSocket>;
    userId: number;
    settings: ProductivitySettings;
}

const ProductivityTracker: React.FC<ProductivityTrackerProps> = ({ 
    wsRef, 
    userId, 
    settings
}) => {
    const [status, setStatus] = useState<'productive_working' | 'idle_and_not_working' | null>(null);
    const backToWorkAudioRef = useRef<HTMLAudioElement>(null);
    const workedAudioRef = useRef<HTMLAudioElement>(null);
    const [hasScreenPermission, setHasScreenPermission] = useState(false);
    const [hasWebcamPermission, setHasWebcamPermission] = useState(false);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);

    // Set up screen capture stream when enabled
    useEffect(() => {
        const setupScreenCapture = async () => {
            if (settings.screen_capture_enabled && !screenStreamRef.current) {
                try {
                    const stream = await navigator.mediaDevices.getDisplayMedia({
                        video: { displaySurface: 'monitor' }
                    });
                    screenStreamRef.current = stream;
                    setHasScreenPermission(true);
                    
                    // Handle stream ending
                    stream.getVideoTracks()[0].addEventListener('ended', () => {
                        screenStreamRef.current = null;
                        setHasScreenPermission(false);
                    });
                } catch (error) {
                    console.error('Error setting up screen capture:', error);
                    setHasScreenPermission(false);
                }
            }
        };

        if (settings.screen_capture_enabled && !screenStreamRef.current) {
            setupScreenCapture();
        } else if (!settings.screen_capture_enabled) {
            // Cleanup when disabled
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }
            setHasScreenPermission(false);
        }

        return () => {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
                setHasScreenPermission(false);
            }
        };
    }, [settings.screen_capture_enabled]);

    // Set up webcam stream when enabled
    useEffect(() => {
        const setupWebcam = async () => {
            if (settings.webcam_capture_enabled && !webcamStreamRef.current) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    webcamStreamRef.current = stream;
                    setHasWebcamPermission(true);

                    // Handle stream ending
                    stream.getVideoTracks()[0].addEventListener('ended', () => {
                        console.log('Webcam stopped by user');
                        if (webcamStreamRef.current) {
                            webcamStreamRef.current.getTracks().forEach(track => {
                                track.stop();
                                console.log('Webcam track stopped');
                            });
                            webcamStreamRef.current = null;
                        }
                        setHasWebcamPermission(false);
                    });
                } catch (error) {
                    console.error('Error setting up webcam:', error);
                    setHasWebcamPermission(false);
                }
            }
        };

        if (settings.webcam_capture_enabled && !webcamStreamRef.current) {
            setupWebcam();
        } else if (!settings.webcam_capture_enabled && webcamStreamRef.current) {
            // Cleanup when disabled
            webcamStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            webcamStreamRef.current = null;
            setHasWebcamPermission(false);
        }

        // Cleanup on unmount or setting change
        return () => {
            if (webcamStreamRef.current) {
                webcamStreamRef.current.getTracks().forEach(track => {
                    track.stop();
                });
                webcamStreamRef.current = null;
                setHasWebcamPermission(false);
            }
        };
    }, [settings.webcam_capture_enabled]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'presence_update' && data.userId === userId) {

                setStatus(data.status);
                
                // Play appropriate sound based on status
                if (data.status === 'idle_and_not_working' && backToWorkAudioRef.current) {
                    backToWorkAudioRef.current.play().catch(console.error);
                } else if (data.status === 'productive_working' && workedAudioRef.current) {
                    workedAudioRef.current.play().catch(console.error);
                }
            } else if (data.type === 'break_reminder' || data.type === 'productivity_reminder') {
                // Show notification for both break and productivity reminders
                if (Notification.permission === 'granted') {
                    new Notification(data.type === 'break_reminder' ? 'Break Time!' : 'Time to Focus', {
                        body: data.message,
                        icon: '/favicon.ico'
                    });
                    // Only play sound for productivity reminders
                    if (data.type === 'productivity_reminder' && backToWorkAudioRef.current) {
                        backToWorkAudioRef.current.play().catch(console.error);
                    }
                }
            }
        };

        const ws = wsRef.current;
        if (ws) {
            ws.addEventListener('message', handleMessage);
        }

        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            if (ws) {
                ws.removeEventListener('message', handleMessage);
            }
        };
    }, [wsRef, userId, status]);

    // Handle screen capture and webcam capture
    useEffect(() => {
        let captureInterval: NodeJS.Timeout | null = null;

        const captureAndSend = async () => {
            try {
                // Only check if tracking is enabled
                if (!settings.tracking_enabled) {
                    return;
                }

                console.log('Capture settings:', {
                    screenEnabled: settings.screen_capture_enabled,
                    hasScreenPermission,
                    hasScreenStream: !!screenStreamRef.current,
                    webcamEnabled: settings.webcam_capture_enabled,
                    hasWebcamPermission,
                    hasWebcamStream: !!webcamStreamRef.current
                });

                const captures: { screen_image: string; webcam_image?: string } = {
                    screen_image: ''
                };

                // Capture screen if enabled and we have permission
                if (settings.screen_capture_enabled && hasScreenPermission && screenStreamRef.current) {
                    try {
                        console.log('Using screen capture stream');
                        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
                        
                        // Create video element to capture frame
                        const video = document.createElement('video');
                        video.srcObject = new MediaStream([screenTrack]);
                        await video.play();
                        console.log('Video element created and playing');

                        // Capture frame
                        const canvas = document.createElement('canvas');
                        canvas.width = 800;
                        canvas.height = 600;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                        console.log('Frame captured to canvas');
                        
                        // Convert to base64 with compression
                        captures.screen_image = canvas.toDataURL('image/jpeg', 0.5);
                        const imageSize = Math.round(captures.screen_image.length / 1024);
                        console.log(`Screen capture complete. Image size: ${imageSize}KB`);

                        // Clean up capture elements
                        video.remove();
                        canvas.remove();
                        console.log('Cleanup completed');
                    } catch (error) {
                        console.error('Error during screen capture:', error);
                    }
                }

                // Capture webcam if enabled and we have permission
                if (settings.webcam_capture_enabled && hasWebcamPermission && webcamStreamRef.current) {
                    try {
                        const webcamTrack = webcamStreamRef.current.getVideoTracks()[0];
                        
                        // Create video element to capture frame
                        const video = document.createElement('video');
                        video.srcObject = new MediaStream([webcamTrack]);
                        await video.play();

                        // Capture frame
                        const canvas = document.createElement('canvas');
                        canvas.width = 640;
                        canvas.height = 480;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Convert to base64 with compression
                        captures.webcam_image = canvas.toDataURL('image/jpeg', 0.5);

                        // Clean up capture elements
                        video.remove();
                        canvas.remove();
                        console.log('Webcam cleanup completed');
                    } catch (error) {
                        console.error('Error during webcam capture:', error);
                    }
                }

                // Send to server if we have any captures
                if ((captures.screen_image || captures.webcam_image) && wsRef.current?.readyState === WebSocket.OPEN) {
                    console.log('Preparing to send captures to server...', {
                        wsState: wsRef.current.readyState,
                        hasScreenImage: !!captures.screen_image,
                        hasWebcamImage: !!captures.webcam_image,
                        screenImageSize: captures.screen_image ? Math.round(captures.screen_image.length / 1024) : 0,
                        webcamImageSize: captures.webcam_image ? Math.round(captures.webcam_image.length / 1024) : 0
                    });

                    // Send each capture in a consistent format
                    if (captures.screen_image) {
                        const message = JSON.stringify({
                            type: 'productivity_screenshot',
                            capture_type: 'screen',
                            token: localStorage.getItem('token'),
                            data: {
                                screen_image: captures.screen_image,
                                type: 'screen'
                            }
                        });
                        console.log('Screen message size:', Math.round(message.length / 1024), 'KB');
                        try {
                            wsRef.current.send(message);
                            console.log('Screen capture sent successfully');
                        } catch (error) {
                            console.error('Error sending screen capture:', error);
                        }
                    }

                    if (captures.webcam_image) {
                        const message = JSON.stringify({
                            type: 'productivity_screenshot',
                            capture_type: 'webcam',
                            token: localStorage.getItem('token'),
                            data: {
                                screen_image: captures.webcam_image,
                                type: 'webcam'
                            }
                        });
                        console.log('Webcam message size:', Math.round(message.length / 1024), 'KB');
                        try {
                            wsRef.current.send(message);
                            console.log('Webcam capture sent successfully');
                        } catch (error) {
                            console.error('Error sending webcam capture:', error);
                        }
                    }
                } else {
                    console.log('Skipping send:', {
                        hasScreenImage: !!captures.screen_image,
                        hasWebcamImage: !!captures.webcam_image,
                        wsOpen: wsRef.current?.readyState === WebSocket.OPEN,
                        wsState: wsRef.current?.readyState
                    });
                }
            } catch (error) {
                console.error('Error in capture process:', error);
            }
        };

        // Only start interval if tracking is enabled
        if (settings.tracking_enabled) {
            captureInterval = setInterval(captureAndSend, 10000); // Every 10 seconds
            // Do an initial capture
            captureAndSend();
        }

        return () => {
            if (captureInterval) {
                console.log('Cleaning up capture interval');
                clearInterval(captureInterval);
                captureInterval = null;
            }
        };
    }, [
        settings.tracking_enabled,
        settings.screen_capture_enabled,
        settings.webcam_capture_enabled,
        hasScreenPermission,
        hasWebcamPermission,
        wsRef
    ]);

    // Visual effects based on status
    const statusClasses = status === 'productive_working'
        ? 'fixed inset-0 pointer-events-none bg-green-500/10 animate-pulse'
        : status === 'idle_and_not_working'
            ? 'fixed inset-0 pointer-events-none bg-red-500/10 animate-flash'
            : '';

    return (
        <>
            {/* Visual effect overlay */}
            {status && settings.tracking_enabled && <div className={statusClasses} />}
            
            {/* Audio for notifications */}
            <audio ref={backToWorkAudioRef} src="/assets/back_to_work.mp3" preload="auto" />
            <audio ref={workedAudioRef} src="/assets/worked.mp4" preload="auto" />
            
            {/* Status indicator (for testing) */}
            {settings.tracking_enabled && status && (
                <div className="fixed bottom-4 right-4 px-3 py-1 rounded-full text-xs font-medium bg-opacity-90"
                    style={{
                        backgroundColor: status === 'productive_working' ? '#10B981' : '#EF4444',
                        color: 'white'
                    }}>
                    {status === 'productive_working' ? 'Productive' : 'Idle'}
                </div>
            )}
        </>
    );
};

export default ProductivityTracker; 