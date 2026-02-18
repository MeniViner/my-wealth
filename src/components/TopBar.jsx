import { useHeader } from '../contexts/HeaderContext';

const TopBar = ({ isDemoActive }) => {
    const { title, subtitle, actions, isVisible } = useHeader();

    if (!isVisible || (!title && !actions)) return null;

    return (
        <div
            className={`fixed left-0 right-0 z-40 flex items-center px-4 h-16 md:hidden
        ${isDemoActive ? 'top-10' : 'top-0'}
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300`}
        >
            <div className="flex-1 flex flex-col justify-center min-w-0">
                {title && (
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate font-hebrew heading-animation">
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate fade-in">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex items-center gap-2 mr-3 animate-in fade-in slide-in-from-left-4">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default TopBar;
