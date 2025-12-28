import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Sparkles, Loader2, Plus, History, Trash2, AlertCircle, X } from 'lucide-react';
import { db, appId } from '../services/firebase';
import { callGeminiAI } from '../services/gemini';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { confirmAlert, successToast } from '../utils/alerts';

const AIAdvisor = ({ assets, totalWealth, user }) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [error, setError] = useState(null);

  // Fetch reports history from Firebase
  useEffect(() => {
    if (!user || !db) return;
    
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'reports'), 
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(reports);
      if (reports.length > 0 && !currentReport) {
        setCurrentReport(reports[0]);
      }
    });
    
    return () => unsubscribe();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Validate assets
      if (!assets || assets.length === 0) {
        throw new Error('אין נכסים לניתוח. אנא הוסף נכסים תחילה.');
      }

      const assetsSummary = assets.map(a => 
        `- ${a.name} (${a.instrument} ב-${a.platform}): ₪${a.value.toLocaleString()}`
      ).join('\n');
      
      const prompt = `
      אתה יועץ השקעות. שווי תיק: ₪${totalWealth.toLocaleString()}.
      נכסים:
      ${assetsSummary}
      
      החזר דוח בעברית (Markdown):
      **כותרות**, רשימות, ניתוח סיכונים והמלצות.
      `;

      const result = await callGeminiAI(prompt);
      
      // Check if result contains error message
      if (result && result.includes('שגיאה')) {
        throw new Error(result);
      }

      const newReport = { 
        date: new Date().toISOString(), 
        displayDate: new Date().toLocaleDateString('he-IL'),
        content: result 
      };
      
      // Save to Firebase
      if (user && db) {
        try {
          await addDoc(
            collection(db, 'artifacts', appId, 'users', user.uid, 'reports'), 
            newReport
          );
        } catch (firebaseError) {
          console.error('Firebase save error:', firebaseError);
          // Still show the report even if Firebase save fails
          setError('הדוח נוצר בהצלחה אך לא נשמר במסד הנתונים. שגיאה: ' + firebaseError.message);
        }
      }
      
      setCurrentReport(newReport);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.message || 'אירעה שגיאה ביצירת הדוח. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    const confirmed = await confirmAlert('מחיקת דוח', 'למחוק דוח זה?', 'warning', true);
    if (confirmed && user && db) {
      await deleteDoc(
        doc(db, 'artifacts', appId, 'users', user.uid, 'reports', reportId)
      );
      if (currentReport?.id === reportId) {
        setCurrentReport(null);
      }
      await successToast('נמחק בהצלחה', 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-purple-600" size={32} />
            יועץ השקעות (AI)
          </h2>
        </div>
        <div className="relative group">
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-70"
            title="צור דוח ניתוח השקעות חדש באמצעות AI"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            צור דוח חדש
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            צור דוח ניתוח השקעות חדש באמצעות AI
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">שגיאה ביצירת הדוח</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
            aria-label="סגור הודעת שגיאה"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-4">
          {history.map(report => (
            <button
              key={report.id}
              onClick={() => setCurrentReport(report)}
              className={`px-4 py-2 rounded-lg text-sm border whitespace-nowrap flex items-center gap-2 transition
                ${currentReport?.id === report.id 
                  ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <History size={14} /> {report.displayDate || new Date(report.date).toLocaleDateString('he-IL')}
            </button>
          ))}
        </div>
      )}

      {currentReport ? (
        <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border border-slate-200 relative min-h-[500px] animate-fade-in">
          <button 
            onClick={() => handleDeleteReport(currentReport.id)} 
            className="absolute top-4 left-4 text-red-400 hover:bg-red-50 p-2 rounded-full"
          >
            <Trash2 size={16} />
          </button>
          <MarkdownRenderer content={currentReport.content} />
        </div>
      ) : (
        <div className="text-center p-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          לחץ על "צור דוח חדש" כדי להתחיל
        </div>
      )}
    </div>
  );
};

export default AIAdvisor;

