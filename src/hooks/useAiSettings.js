import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { successToast } from '../utils/alerts';

/**
 * Hook to manage AI Advisor settings and Model configuration
 * 
 * @param {Object} user - Firebase user object
 * @returns {Object} - { aiConfig, modelConfig, updateAiConfig, updateModelConfig, loading }
 */
export const useAiSettings = (user) => {
    const [loading, setLoading] = useState(true);

    // AI General Config
    const [aiConfig, setAiConfig] = useState({
        historyLimit: 10,
        contextEnabled: true
    });

    // Model & API Key Config
    const [modelConfig, setModelConfig] = useState({
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        geminiApiKey: '',
        groqApiKey: ''
    });

    // Load Initial Data & Setup Listeners
    useEffect(() => {
        if (!user || !db) {
            setLoading(false);
            return;
        }

        const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');
        const modelConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'modelConfig');
        const legacyConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'groqConfig');

        // Load AI Config
        const loadAiConfig = async () => {
            try {
                const docSnap = await getDoc(aiConfigRef);
                if (docSnap.exists()) {
                    setAiConfig(docSnap.data());
                } else {
                    // Initialize default
                    const defaultConfig = { historyLimit: 10, contextEnabled: true };
                    await setDoc(aiConfigRef, defaultConfig);
                    setAiConfig(defaultConfig);
                }
            } catch (error) {
                console.error('Error loading AI config:', error);
            }
        };

        // Load Model Config
        const loadModelConfig = async () => {
            try {
                // Try new config first
                const docSnap = await getDoc(modelConfigRef);
                if (docSnap.exists()) {
                    setModelConfig(docSnap.data());
                } else {
                    // Try to migrate legacy config
                    const legacySnap = await getDoc(legacyConfigRef);
                    if (legacySnap.exists()) {
                        const data = legacySnap.data();
                        const newConfig = {
                            provider: 'groq',
                            model: data.model || 'llama-3.3-70b-versatile',
                            groqApiKey: data.customApiKey || '',
                            geminiApiKey: ''
                        };
                        setModelConfig(newConfig);
                        await setDoc(modelConfigRef, newConfig);
                    } else {
                        // Initialize default (Gemini 3 Flash)
                        const defaultConfig = {
                            provider: 'gemini',
                            model: 'gemini-3-flash-preview',
                            geminiApiKey: '',
                            groqApiKey: ''
                        };
                        await setDoc(modelConfigRef, defaultConfig);
                        setModelConfig(defaultConfig);
                    }
                }
            } catch (error) {
                console.error('Error loading Model config:', error);
            }
        };

        // Run valid loaders
        Promise.all([loadAiConfig(), loadModelConfig()]).finally(() => setLoading(false));

        // Listeners
        const unsubAi = onSnapshot(aiConfigRef, (snap) => {
            if (snap.exists()) setAiConfig(snap.data());
        });

        const unsubModel = onSnapshot(modelConfigRef, (snap) => {
            if (snap.exists()) setModelConfig(snap.data());
        });

        return () => {
            unsubAi();
            unsubModel();
        };
    }, [user]);

    // Update Functions
    const updateAiConfig = async (newConfig) => {
        if (!user || !db) return;
        try {
            setAiConfig(newConfig); // Optimistic update
            const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');
            await setDoc(aiConfigRef, newConfig);
            // successToast('הגדרות נשמרו', 1000); // Optional: toast here or in UI
        } catch (error) {
            console.error('Error saving AI config:', error);
            // Revert or show error
        }
    };

    const updateModelConfig = async (newConfig) => {
        if (!user || !db) return;
        try {
            setModelConfig(newConfig); // Optimistic update
            const modelConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'modelConfig');
            await setDoc(modelConfigRef, newConfig);
            // successToast('הגדרות מודל נשמרו', 1000);
        } catch (error) {
            console.error('Error saving Model config:', error);
        }
    };

    return {
        aiConfig,
        modelConfig,
        updateAiConfig,
        updateModelConfig,
        loading
    };
};
