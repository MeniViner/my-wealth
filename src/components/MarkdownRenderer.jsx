/**
 * Simple Markdown renderer for displaying Gemini AI responses
 * Supports headers, lists, bold text, and tables
 */
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  const lines = content.split('\n');
  
  // Parse tables
  const parseTable = (startIdx) => {
    const tableLines = [];
    let idx = startIdx;
    
    // Find all table rows (until we hit a non-table line)
    while (idx < lines.length) {
      const line = lines[idx];
      // Check if it's a table row (contains |)
      if (line.includes('|') && line.trim().startsWith('|')) {
        tableLines.push(line);
        idx++;
      } else if (line.trim() === '' && idx === startIdx + 1) {
        // Skip empty line after header
        idx++;
        continue;
      } else {
        break;
      }
    }
    
    if (tableLines.length < 2) return null; // Need at least header and separator
    
    // Parse header
    const headerLine = tableLines[0];
    const headers = headerLine.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
    
    // Skip separator line (second line)
    if (tableLines.length < 3) return null;
    
    // Parse data rows
    const rows = tableLines.slice(2).map(rowLine => {
      return rowLine.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
    });
    
    return {
      headers,
      rows,
      endIdx: idx
    };
  };
  
  const renderCell = (cell) => {
    const parts = cell.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => 
      part.startsWith('**') && part.endsWith('**') 
        ? <strong key={i} className="text-slate-900 dark:text-white font-bold">{part.slice(2, -2)}</strong> 
        : part
    );
  };
  
  const elements = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
      // Check for table
      if (line.includes('|') && line.trim().startsWith('|')) {
        const table = parseTable(i);
        if (table) {
          elements.push(
            <div key={i} dir="rtl" className="my-6 overflow-x-auto rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-700/50 font-hebrew">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" dir="rtl">
                    <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30">
                      <tr>
                        {table.headers.map((header, hIdx) => (
                          <th 
                            key={hIdx} 
                            className="px-6 py-4 text-right text-sm font-bold text-slate-800 dark:text-white border-b-2 border-emerald-200 dark:border-emerald-700 first:rounded-tl-lg last:rounded-tr-lg"
                            style={{ fontFamily: "'Assistant', 'Heebo', 'Rubik', 'Segoe UI', 'Arial Hebrew', 'David', sans-serif" }}
                          >
                            <div className="flex items-center justify-end gap-2">
                              {renderCell(header)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                      {table.rows.map((row, rIdx) => (
                        <tr 
                          key={rIdx} 
                          className="transition-all duration-150 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 hover:shadow-sm"
                        >
                          {row.map((cell, cIdx) => {
                            // Check if cell contains numbers with + or - (for financial data)
                            const hasPositive = cell.includes('+');
                            const hasNegative = cell.includes('-');
                            const isNumeric = /[\d,]+/.test(cell);
                            
                            let cellClassName = "px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200";
                            
                            if (hasPositive && isNumeric) {
                              cellClassName += " text-emerald-700 dark:text-emerald-400 font-semibold";
                            } else if (hasNegative && isNumeric) {
                              cellClassName += " text-red-600 dark:text-red-400 font-semibold";
                            }
                            
                            return (
                              <td 
                                key={cIdx} 
                                className={cellClassName}
                                style={{ fontFamily: "'Assistant', 'Heebo', 'Rubik', 'Segoe UI', 'Arial Hebrew', 'David', sans-serif" }}
                                dir="rtl"
                              >
                                <div className="flex items-center justify-end">
                                  {renderCell(cell)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
          i = table.endIdx;
          continue;
        }
      }
    
    // Headers
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-bold text-slate-800 dark:text-white mt-4 border-b border-slate-200 dark:border-slate-700 pb-2">
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-bold text-slate-800 dark:text-white mt-3">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      // Lists
      const cleanLine = line.replace(/^[*|-] /, '');
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      elements.push(
        <div key={i} className="flex gap-2 items-start">
          <span className="text-purple-500 dark:text-purple-400 mt-1.5">•</span>
          <span className="text-slate-700 dark:text-slate-200">
            {parts.map((part, pIdx) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={pIdx} className="text-slate-900 dark:text-white font-bold">{part.slice(2, -2)}</strong> 
                : part
            )}
          </span>
        </div>
      );
    } else if (line.trim() === '') {
      // Empty lines
      elements.push(<br key={i} />);
    } else {
      // Regular paragraphs with bold support
      const parts = line.split(/(\*\*.*?\*\*)/g);
      elements.push(
        <p key={i} className="text-slate-700 dark:text-slate-200">
          {parts.map((part, pIdx) => 
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={pIdx} className="text-slate-900 dark:text-white font-bold">{part.slice(2, -2)}</strong> 
              : part
          )}
        </p>
      );
    }
    
    i++;
  }
  
  return (
    <div className="space-y-3 font-sans text-slate-700 dark:text-slate-200 leading-relaxed" dir="rtl">
      {elements}
    </div>
  );
};

export default MarkdownRenderer;

