/**
 * FormSection - Soft section divider for forms
 * Provides visual grouping without heavy cards
 */
const FormSection = ({ icon: Icon, title, children, className = '' }) => {
    return (
        <div className={`space-y-4 ${className}`}>
            {title && (
                <div className="flex items-center gap-2 mb-6">
                    {Icon && <Icon className="text-slate-400 dark:text-slate-500" size={18} />}
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 tracking-wide">
                        {title}
                    </h3>
                </div>
            )}
            {children}
        </div>
    );
};

export default FormSection;
