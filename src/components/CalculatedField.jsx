/**
 * CalculatedField - Input field that displays calculated values
 * Visually distinct from editable fields with subtle background and optional badge
 */
const CalculatedField = ({
    label,
    value,
    onChange,
    placeholder,
    type = 'number',
    readOnly = false,
    calculated = false,
    icon: Icon,
    prefix,
    suffix,
    helpText,
    className = '',
    ...props
}) => {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {Icon && <Icon className="inline mr-2" size={14} />}
                    {label}
                </label>
            )}

            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    readOnly={readOnly || calculated}
                    placeholder={placeholder}
                    className={`
            w-full p-3 rounded-lg font-mono text-slate-900 dark:text-slate-100
            transition-all duration-200
            ${calculated || readOnly
                            ? 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-default'
                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500'
                        }
            ${prefix ? 'pr-10' : ''}
            ${suffix ? 'pl-16' : ''}
          `}
                    {...props}
                />

                {prefix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm font-bold pointer-events-none">
                        {prefix}
                    </span>
                )}

                {suffix && calculated && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                        {suffix}
                    </span>
                )}

                {calculated && !suffix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded-full pointer-events-none">
                        מחושב
                    </span>
                )}
            </div>

            {helpText && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    {helpText}
                </p>
            )}
        </div>
    );
};

export default CalculatedField;
