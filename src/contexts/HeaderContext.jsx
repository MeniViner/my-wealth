import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const HeaderContext = createContext({
    title: '',
    setTitle: () => { },
    subtitle: '',
    setSubtitle: () => { },
    actions: null,
    setActions: () => { },
    isVisible: true,
    setIsVisible: () => { },
});

export const HeaderProvider = ({ children }) => {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [actions, setActions] = useState(null);
    const [isVisible, setIsVisible] = useState(true);
    const location = useLocation();

    // Reset header state on route change
    useEffect(() => {
        setTitle('');
        setSubtitle('');
        setActions(null);
        setIsVisible(true);
    }, [location.pathname]);

    return (
        <HeaderContext.Provider
            value={{
                title,
                setTitle,
                subtitle,
                setSubtitle,
                actions,
                setActions,
                isVisible,
                setIsVisible,
            }}
        >
            {children}
        </HeaderContext.Provider>
    );
};

export const useHeader = () => {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new Error('useHeader must be used within a HeaderProvider');
    }
    return context;
};
