import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, HelpCircle, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useAiSettings } from '../hooks/useAiSettings';
import { GEMINI_MODELS, GROQ_MODELS } from '../services/gemini';

const AdvisorSettings = ({ user }) => {
    const navigate = useNavigate();
    const { aiConfig, modelConfig, updateAiConfig, updateModelConfig, loading } = useAiSettings(user);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showApiKeyHelp, setShowApiKeyHelp] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                        aria-label="חזור"
                    >
                        <ArrowRight size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-emerald-600 dark:text-emerald-400" />
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">הגדרות יועץ AI</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

                {/* General Settings */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-100">הגדרות כלליות</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* History Limit */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-100">
                                        זיכרון צ'אט (הודעות)
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                                        מספר ההודעות האחרונות שנשלחות ל-AI (Context Window)
                                    </p>
                                </div>
                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {aiConfig.historyLimit}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={aiConfig.historyLimit}
                                onChange={(e) => updateAiConfig({ ...aiConfig, historyLimit: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                                <span>1</span>
                                <span>20</span>
                            </div>
                        </div>

                        {/* Context Enabled */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-100">
                                    כלול נתוני תיק השקעות
                                </label>
                                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                                    כאשר מופעל, נתוני התיק נשלחים אוטומטית ל-AI כהקשר
                                </p>
                            </div>
                            <button
                                onClick={() => updateAiConfig({ ...aiConfig, contextEnabled: !aiConfig.contextEnabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${aiConfig.contextEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                                    }`}
                                role="switch"
                                aria-checked={aiConfig.contextEnabled}
                            >
                                <span
                                    className={`absolute h-4 w-4 rounded-full bg-white transition-all ${aiConfig.contextEnabled ? 'left-1' : 'right-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Model Settings */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-100">מודל AI</h3>
                    </div>
                    <div className="p-6 space-y-6">

                        {/* Provider Selector */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-100 block mb-2">
                                ספק AI
                            </label>
                            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                                <button
                                    onClick={() => updateModelConfig({ ...modelConfig, provider: 'gemini', model: 'gemini-3-flash-preview' })}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${modelConfig.provider === 'gemini'
                                        ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                        }`}
                                >
                                    Google Gemini
                                </button>
                                <button
                                    onClick={() => updateModelConfig({ ...modelConfig, provider: 'groq', model: 'llama-3.3-70b-versatile' })}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${modelConfig.provider === 'groq'
                                        ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                        }`}
                                >
                                    Groq
                                </button>
                            </div>
                        </div>

                        {/* Model Selector */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-100 block mb-2">
                                מודל
                            </label>
                            <div className="relative">
                                <select
                                    value={modelConfig.model}
                                    onChange={(e) => updateModelConfig({ ...modelConfig, model: e.target.value })}
                                    className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                                >
                                    {Object.entries(modelConfig.provider === 'gemini' ? GEMINI_MODELS : GROQ_MODELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Custom API Key */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-100 block mb-2">
                                מפתח API מותאם אישית (אופציונלי)
                            </label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? "text" : "password"}
                                    value={(modelConfig.provider === 'gemini' ? modelConfig.geminiApiKey : modelConfig.groqApiKey) || ''}
                                    onChange={(e) => updateModelConfig({
                                        ...modelConfig,
                                        [modelConfig.provider === 'gemini' ? 'geminiApiKey' : 'groqApiKey']: e.target.value
                                    })}
                                    placeholder={`הכנס מפתח ${modelConfig.provider === 'gemini' ? 'Gemini' : 'Groq'} API...`}
                                    className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                                אם ריק, נשתמש במפתח ברירת המחדל מההגדרות
                            </p>
                        </div>

                        {/* API Key Help */}
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <button
                                type="button"
                                onClick={() => setShowApiKeyHelp(!showApiKeyHelp)}
                                className="w-full flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200"
                            >
                                <div className="flex items-center gap-2">
                                    <HelpCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                                    <span>איך להשיג מפתח API?</span>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform ${showApiKeyHelp ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {showApiKeyHelp && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {modelConfig.provider === 'gemini' ? (
                                        <>
                                            <p className="font-medium">שלבים לקבלת מפתח Google Gemini:</p>
                                            <ol className="list-decimal list-inside space-y-1 mr-2">
                                                <li>כנס ל-<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline">aistudio.google.com</a></li>
                                                <li>התחבר עם חשבון Google שלך</li>
                                                <li>לחץ על "Create API Key"</li>
                                                <li>בחר ב-"Create API key in new project"</li>
                                                <li>העתק את המפתח שנוצר והדבק אותו למעלה</li>
                                            </ol>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium">שלבים לקבלת מפתח API של Groq:</p>
                                            <ol className="list-decimal list-inside space-y-1 mr-2">
                                                <li>כנס ל-<a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline">console.groq.com/keys</a></li>
                                                <li>התחבר או הירשם לחשבון Groq (חינם)</li>
                                                <li>לחץ על "Create API Key" (צור מפתח)</li>
                                                <li>תן שם למפתח (לדוגמה: "MyWealth App")</li>
                                                <li>העתק את המפתח שנוצר והדבק אותו למעלה</li>
                                            </ol>
                                        </>
                                    )}
                                    <p className="text-amber-600 dark:text-amber-400 mt-2">
                                        ⚠️ אל תשתף את המפתח עם אחרים!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AdvisorSettings;
