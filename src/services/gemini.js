/**
 * Service for interacting with Gemini AI via Puter.js
 * Using Puter.js for free Gemini access without API keys
 * Documentation: https://developer.puter.com/tutorials/free-gemini-api
 */

/**
 * Wait for Puter.js to be loaded
 * @returns {Promise<void>}
 */
const waitForPuter = async () => {
  if (typeof window === 'undefined') {
    throw new Error("Window object not available");
  }

  // If Puter is already loaded, return immediately
  if (window.puter && window.puter.ai) {
    return;
  }

  // Wait up to 5 seconds for Puter to load
  const maxWait = 5000;
  const startTime = Date.now();
  
  while (!window.puter || !window.puter.ai) {
    if (Date.now() - startTime > maxWait) {
      throw new Error("Puter.js failed to load within 5 seconds");
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

/**
 * Call Gemini AI with a single prompt (legacy support)
 * @param {string} prompt - User prompt
 * @param {string} portfolioContext - Portfolio context string
 * @returns {Promise<string>} - AI response
 */
export const callGeminiAI = async (prompt, portfolioContext = "") => {
  try {
    // Wait for Puter.js to be loaded
    await waitForPuter();

    // Build final prompt with context if provided
    const finalPrompt = portfolioContext 
      ? `System Context: ${portfolioContext}\n\nUser Query: ${prompt}` 
      : prompt;

    // Using Puter.js for free Gemini access
    // Documentation: https://developer.puter.com/tutorials/free-gemini-api
    const response = await window.puter.ai.chat(finalPrompt, { model: 'gemini-3-pro-preview' });
    
    // Puter returns an object, extract the message content
    // Response structure: response.message.content or response.content or response.text
    const content = response?.message?.content || response?.content || response?.text || response;
    
    // If content is still an object, try to stringify it
    if (typeof content !== 'string') {
      const stringified = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
      return stringified || "לא התקבלה תשובה תקינה.";
    }
    
    return content || "לא התקבלה תשובה תקינה.";
  } catch (error) {
    console.error("Puter AI Error:", error);
    
    // Provide helpful error messages
    if (error.message.includes("failed to load")) {
      return "שגיאה: Puter.js לא נטען. אנא ודא שהסקריפט נטען ב-index.html";
    }
    
    return `שגיאה בקבלת תשובה מה-AI (Puter): ${error.message || "שגיאה לא ידועה"}`;
  }
};

/**
 * Call Gemini AI with message history (for chat interface)
 * Token Estimation:
 * - Portfolio Context: ~500 tokens
 * - Recent Chat History (last 10-15 messages): ~1000 tokens
 * - Total per request: ~1500 tokens (Very efficient for Gemini Flash)
 * 
 * @param {Array} messages - Array of message objects with {role: 'user'|'assistant'|'system', content: string}
 * @param {string} portfolioContext - Portfolio context string (will be added as system message)
 * @returns {Promise<string>} - AI response
 */
export const callGeminiAIWithHistory = async (messages = [], portfolioContext = "") => {
  try {
    // Wait for Puter.js to be loaded
    await waitForPuter();

    // Build messages array for Puter.js
    // Format: [{role: 'system'|'user'|'assistant', content: string}, ...]
    const formattedMessages = [];

    // Add system message with portfolio context if provided
    if (portfolioContext) {
      formattedMessages.push({
        role: 'system',
        content: portfolioContext
      });
    }

    // Add chat history (last 10-15 messages to prevent context overflow)
    // Token optimization: Only send recent history
    const recentMessages = messages.slice(-15);
    formattedMessages.push(...recentMessages);

    // Using Puter.js chat API with message history
    // Documentation: https://developer.puter.com/tutorials/free-gemini-api
    const response = await window.puter.ai.chat(formattedMessages, { model: 'gemini-3-pro-preview' });
    
    // Extract the message content
    const content = response?.message?.content || response?.content || response?.text || response;
    
    // If content is still an object, try to stringify it
    if (typeof content !== 'string') {
      const stringified = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
      return stringified || "לא התקבלה תשובה תקינה.";
    }
    
    return content || "לא התקבלה תשובה תקינה.";
  } catch (error) {
    console.error("Puter AI Error:", error);
    
    // Provide helpful error messages
    if (error.message.includes("failed to load")) {
      return "שגיאה: Puter.js לא נטען. אנא ודא שהסקריפט נטען ב-index.html";
    }
    
    return `שגיאה בקבלת תשובה מה-AI (Puter): ${error.message || "שגיאה לא ידועה"}`;
  }
};

