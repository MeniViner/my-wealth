/**
 * Simple Markdown renderer for displaying Gemini AI responses
 */
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  const lines = content.split('\n');
  
  return (
    <div className="space-y-3 font-sans text-slate-700 leading-relaxed">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl font-bold text-slate-800 mt-4 border-b border-slate-200 pb-2">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-lg font-bold text-slate-800 mt-3">
              {line.replace('### ', '')}
            </h3>
          );
        }
        
        // Lists
        if (line.startsWith('* ') || line.startsWith('- ')) {
          const cleanLine = line.replace(/^[*|-] /, '');
          const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
          return (
            <div key={idx} className="flex gap-2 items-start">
              <span className="text-purple-500 mt-1.5">•</span>
              <span>
                {parts.map((part, i) => 
                  part.startsWith('**') && part.endsWith('**') 
                    ? <strong key={i} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong> 
                    : part
                )}
              </span>
            </div>
          );
        }
        
        // Empty lines
        if (line.trim() === '') return <br key={idx} />;
        
        // Regular paragraphs with bold support
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx}>
            {parts.map((part, i) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={i} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong> 
                : part
            )}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;

