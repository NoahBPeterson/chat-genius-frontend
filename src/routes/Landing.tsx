import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';

const Landing: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900 to-purple-700 overflow-auto">
            <div className="max-w-4xl mx-auto px-8 py-20">
                <div className="text-center text-white">
                    <h1 className="text-5xl font-bold mb-8">Welcome to Chat Genius</h1>
                    <p className="text-xl mb-16 text-purple-200">
                        Experience the next generation of AI-powered chat communication.
                        Connect with your team, collaborate seamlessly, and boost productivity.
                    </p>
                    
                    <div className="space-y-4 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center mb-20">
                        <Link to="/login">
                            <Button 
                                variant="contained" 
                                color="primary" 
                                size="large"
                                className="w-full sm:w-auto"
                            >
                                LOGIN
                            </Button>
                        </Link>
                        <Link to="/register">
                            <Button 
                                variant="contained" 
                                color="secondary" 
                                size="large"
                                className="w-full sm:w-auto"
                            >
                                REGISTER
                            </Button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="p-10 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors">
                            <div className="text-4xl mb-6">🤖</div>
                            <h3 className="text-xl font-semibold mb-4">AI-Powered</h3>
                            <p className="text-purple-100">
                                Intelligent chat assistance and automated responses
                            </p>
                        </div>
                        <div className="p-10 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors">
                            <div className="text-4xl mb-6">👥</div>
                            <h3 className="text-xl font-semibold mb-4">Team-Focused</h3>
                            <p className="text-purple-100">
                                Seamless collaboration with threads, reactions, and mentions
                            </p>
                        </div>
                        <div className="p-10 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors">
                            <div className="text-4xl mb-6">⚡</div>
                            <h3 className="text-xl font-semibold mb-4">Real-time</h3>
                            <p className="text-purple-100">
                                Instant messaging and live updates
                            </p>
                        </div>
                    </div>

                    {/* Detailed Feature Sections */}
                    <div className="mt-32 space-y-32">
                        {/* AI-Powered Section */}
                        <div className="text-left">
                            <h2 className="text-3xl font-bold mb-6 text-white">AI-Powered Chat Assistant</h2>
                            <div className="bg-purple-600/40 p-8 rounded-lg">
                                <p className="text-lg mb-6 text-purple-100">
                                    Experience the future of team communication with our advanced AI chat assistant. 
                                    Get instant help, suggestions, and automated responses that make your workflow smoother and more efficient.
                                </p>
                                <ul className="list-disc list-inside space-y-4 text-purple-100">
                                    <li>Smart message suggestions and auto-completions</li>
                                    <li>Intelligent response recommendations</li>
                                    <li>Automated task tracking and reminders</li>
                                    <li>Context-aware assistance that learns from your team's communication patterns</li>
                                </ul>
                            </div>
                        </div>

                        {/* Team-Focused Section */}
                        <div className="text-left">
                            <h2 className="text-3xl font-bold mb-6 text-white">Built for Team Collaboration</h2>
                            <div className="bg-purple-600/40 p-8 rounded-lg">
                                <p className="text-lg mb-6 text-purple-100">
                                    Foster better team communication with features designed to make collaboration natural and effective. 
                                    Keep conversations organized and ensure no important messages get lost in the shuffle.
                                </p>
                                <ul className="list-disc list-inside space-y-4 text-purple-100">
                                    <li>Threaded conversations for organized discussions</li>
                                    <li>Quick reactions to acknowledge messages</li>
                                    <li>@mentions to grab attention when needed</li>
                                    <li>Rich text formatting for clear communication</li>
                                </ul>
                            </div>
                        </div>

                        {/* Real-time Section */}
                        <div className="text-left">
                            <h2 className="text-3xl font-bold mb-6 text-white">Real-time Communication</h2>
                            <div className="bg-purple-600/40 p-8 rounded-lg">
                                <p className="text-lg mb-6 text-purple-100">
                                    Stay connected with your team in real-time. See who's online, who's typing, and get instant updates 
                                    as conversations unfold. Never miss a beat in your team's communication.
                                </p>
                                <ul className="list-disc list-inside space-y-4 text-purple-100">
                                    <li>Instant message delivery and updates</li>
                                    <li>Live typing indicators</li>
                                    <li>Online presence indicators</li>
                                    <li>Real-time notifications for mentions and replies</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action Section */}
                    <div className="mt-32 text-center">
                        <h2 className="text-4xl font-bold mb-8 text-white">Ready to begin?</h2>
                        <p className="text-xl mb-8 text-purple-200">
                            Join Chat Genius today and transform the way your team communicates.
                        </p>
                        <Link to="/register">
                            <Button 
                                variant="contained" 
                                color="secondary" 
                                size="large"
                                className="w-full sm:w-auto px-8 py-3"
                            >
                                GET STARTED
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing; 