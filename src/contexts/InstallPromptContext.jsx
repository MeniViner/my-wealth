
import React, { createContext, useContext, useState, useEffect } from 'react';

const InstallPromptContext = createContext();

export const useInstallPrompt = () => {
    const context = useContext(InstallPromptContext);
    if (!context) {
        throw new Error('useInstallPrompt must be used within an InstallPromptProvider');
    }
    return context;
};

export const InstallPromptProvider = ({ children }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);

            // Check if user has declined before
            const hasDeclined = localStorage.getItem('installPromptDismissed');

            if (!hasDeclined) {
                setShouldShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Detect if app was installed successfully
        window.addEventListener('appinstalled', () => {
            setIsAppInstalled(true);
            setDeferredPrompt(null);
            setShouldShowPrompt(false);
            localStorage.removeItem('installPromptDismissed'); // Reset preference on install
            console.log('PWA was installed');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) {
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // Optionally, send analytics event with outcome of user choice
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShouldShowPrompt(false);
    };

    const dismissPrompt = (dontShowAgain = false) => {
        setShouldShowPrompt(false);
        if (dontShowAgain) {
            localStorage.setItem('installPromptDismissed', 'true');
        }
    };

    const resetPromptPreference = () => {
        localStorage.removeItem('installPromptDismissed');
        // We can't force the prompt to appear again immediately, 
        // but next time the event fires (on reload), it will show.
    };

    return (
        <InstallPromptContext.Provider
            value={{
                deferredPrompt,
                isAppInstalled,
                shouldShowPrompt,
                promptInstall,
                dismissPrompt,
                resetPromptPreference
            }}
        >
            {children}
        </InstallPromptContext.Provider>
    );
};
