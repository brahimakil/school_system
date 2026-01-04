import React from 'react';
import './LoadingScreen.css';

const LoadingScreen: React.FC = () => {
    return (
        <div className="loading-screen">
            <div className="loading-content">
                <div className="loading-logo">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="loading-text">
                    <h2>Skillify</h2>
                    <p>Loading your workspace...</p>
                </div>
                <div className="loading-bar">
                    <div className="loading-bar-fill"></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
