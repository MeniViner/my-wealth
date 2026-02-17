
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../contexts/InstallPromptContext';

const InstallPrompt = () => {
    const { deferredPrompt, shouldShowPrompt, promptInstall, dismissPrompt } = useInstallPrompt();
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            // Check for mobile user agent or small screen
            const isMobileDevice = /android|ipad|iphone|ipod/i.test(userAgent) || window.innerWidth < 768;
            setIsMobile(isMobileDevice);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!shouldShowPrompt || !deferredPrompt) {
        return null;
    }

    // Only show on mobile devices
    if (!isMobile) {
        return null;
    }

    // Only show on home page
    if (location.pathname !== '/') {
        return null;
    }

    const handleInstallClick = () => {
        promptInstall();
    };

    const handleDismissClick = () => {
        dismissPrompt(dontShowAgain);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-center items-end md:items-center pointer-events-none">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 pointer-events-auto max-w-md w-full p-5 md:p-6 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                            <Download className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">מתקינים את האפליקציה?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">חוויית שימוש טובה יותר, וגישה מהירה יותר.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismissClick}
                        className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleInstallClick}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        התקן עכשיו
                    </button>

                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            id="dontShowAgain"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <label htmlFor="dontShowAgain" className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                            אל תראה שוב
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
