import { useState } from 'react';
import { db, appId } from '../services/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Wrench, RefreshCw, DollarSign, RotateCcw } from 'lucide-react';

const DataRepair = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState([]);

    const addLog = (msg) => setLog(prev => [...prev, msg]);

    // כפתור 1: תיקון דולר לשקל (מה שהאייג'נט בנה)
    const fixCurrency = async () => {
        if (!user) return;
        setLoading(true);
        addLog('מתקן מטבעות (USD -> ILS)...');

        try {
            const assetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'assets');
            const snapshot = await getDocs(assetsRef);
            const batch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach(docSnap => {
                const asset = docSnap.data();
                const isTase = asset.marketDataSource === 'tase-local' ||
                    asset.apiId?.startsWith('tase:') ||
                    asset.symbol?.endsWith('.TA');

                if (isTase && asset.currency === 'USD') {
                    batch.update(docSnap.ref, { currency: 'ILS' });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                addLog(`✅ תוקן מטבע ב-${count} נכסים.`);
            } else {
                addLog('✨ המטבעות תקינים.');
            }
        } catch (e) {
            addLog(`❌ שגיאה: ${e.message}`);
        }
        setLoading(false);
    };

    // כפתור 2: תיקון אינפלציה (מה שהאייג'נט בנה - מחלק ב-100)
    const fixInflation = async () => {
        if (!user) return;
        setLoading(true);
        addLog('מתקן מחירים מנופחים (/100)...');

        try {
            const assetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'assets');
            const snapshot = await getDocs(assetsRef);
            const batch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach(docSnap => {
                const asset = docSnap.data();
                const price = Number(asset.currentPrice);
                const isTase = asset.marketDataSource === 'tase-local' || asset.apiId?.startsWith('tase:');

                // אם זה ישראלי והמחיר מעל 100 - כנראה באג ה-500
                if (isTase && price > 100) {
                    const newPrice = price / 100;
                    batch.update(docSnap.ref, { currentPrice: newPrice });
                    addLog(`תיקון ${asset.symbol}: ${price} -> ${newPrice}`);
                    count++;
                }
            });

            if (count > 0) await batch.commit();
            addLog(count > 0 ? '✅ הסתיים.' : '✨ לא נמצאו מחירים מנופחים.');
        } catch (e) {
            addLog(`❌ שגיאה: ${e.message}`);
        }
        setLoading(false);
    };

    // כפתור 3: המבוקש! איפוס למחיר קנייה (RESET)
    const resetToPurchase = async () => {
        if (!confirm('זה ידרוס את המחיר הנוכחי בכל הנכסים ויחזיר אותם למחיר הקנייה. להמשיך?')) return;

        if (!user) return;
        setLoading(true);
        addLog('מאפס מחירים למחיר הקנייה...');

        try {
            const assetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'assets');
            const snapshot = await getDocs(assetsRef);
            const batch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach(docSnap => {
                const asset = docSnap.data();
                // רק אם יש מחיר קנייה תקין
                if (asset.purchasePrice && Number(asset.purchasePrice) > 0) {
                    batch.update(docSnap.ref, {
                        currentPrice: Number(asset.purchasePrice),
                        priceChange24h: 0,
                        lastUpdated: new Date() // מסמן שעודכן עכשיו
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                addLog(`✅ אופסו ${count} נכסים למחיר המקורי.`);
            } else {
                addLog('✨ לא נמצאו נכסים לאיפוס.');
            }
        } catch (e) {
            addLog(`❌ שגיאה: ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 my-6 text-white text-left" dir="ltr">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-400">
                <Wrench /> Emergency Repair Tool
            </h3>

            <div className="flex flex-wrap gap-4 mb-4">
                {/* כפתור 1: תיקון המטבע */}
                <button onClick={fixCurrency} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-mono text-sm">
                    <DollarSign size={16} /> Fix Fake USD (to ILS)
                </button>

                {/* כפתור 2: חלוקה ב-100 */}
                <button onClick={fixInflation} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-mono text-sm">
                    <RefreshCw size={16} /> Fix Inflation (/100)
                </button>

                {/* כפתור 3: איפוס מלא (החדש) */}
                <button onClick={resetToPurchase} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-mono text-sm border-2 border-red-400">
                    <RotateCcw size={16} /> RESET to Purchase Price
                </button>
            </div>

            <div className="bg-black/50 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto border border-slate-800">
                {log.length === 0 ? <span className="text-slate-500">Waiting for action...</span> : log.map((l, i) => (
                    <div key={i} className="mb-1 border-b border-slate-800/50 pb-1">{l}</div>
                ))}
                {loading && <div className="flex items-center gap-2 text-yellow-400 mt-2"><Loader2 className="animate-spin" size={12} /> Working...</div>}
            </div>
        </div>
    );
};

export default DataRepair;