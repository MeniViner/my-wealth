/**
 * Service for interacting with AI via Groq API
 * Using Groq's llama-3.3-70b-versatile model
 * Documentation: https://console.groq.com/docs/quickstart
 * 
 * Includes JSON parsing and validation helpers
 */

import {
  validateChartSuggestions,
  validateSingleChart,
  validateRebalancingAllocation,
  getFallbackChartConfig,
  getFallbackChartSuggestions
} from '../utils/aiValidation';

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Get Groq API Key from environment variables
 * @returns {string} API key
 */
const getGroqApiKey = () => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GROQ_API_KEY environment variable is not set");
  }
  return apiKey;
};

/**
 * Call Groq API with messages
 * @param {Array} messages - Array of message objects
 * @param {number} temperature - Temperature for response generation (0-2)
 * @returns {Promise<string>} - AI response
 */
const callGroqAPI = async (messages, temperature = 0.7) => {
  const apiKey = getGroqApiKey();

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * Call AI with a single prompt (legacy support)
 * @param {string} prompt - User prompt
 * @param {string} portfolioContext - Portfolio context string
 * @returns {Promise<string>} - AI response
 */
export const callGeminiAI = async (prompt, portfolioContext = "") => {
  try {
    // Build messages array
    const messages = [];

    // Add system message with portfolio context if provided
    if (portfolioContext) {
      messages.push({
        role: 'system',
        content: portfolioContext
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: prompt
    });

    // Call Groq API
    const content = await callGroqAPI(messages);

    return content || "לא התקבלה תשובה תקינה.";
  } catch (error) {
    console.error("Groq AI Error:", error);

    // Provide helpful error messages
    if (error.message.includes("VITE_GROQ_API_KEY")) {
      return "שגיאה: מפתח Groq API לא הוגדר. אנא הוסף VITE_GROQ_API_KEY לקובץ .env";
    }

    return `שגיאה בקבלת תשובה מה-AI (Groq): ${error.message || "שגיאה לא ידועה"}`;
  }
};

/**
 * Call AI with message history (for chat interface)
 * Token Estimation:
 * - Portfolio Context: ~500 tokens
 * - Recent Chat History (last 10-15 messages): ~1000 tokens
 * - Total per request: ~1500 tokens (Very efficient for Llama 3.3)
 * 
 * @param {Array} messages - Array of message objects with {role: 'user'|'assistant'|'system', content: string}
 * @param {string} portfolioContext - Portfolio context string (will be added as system message)
 * @returns {Promise<string>} - AI response
 */
export const callGeminiAIWithHistory = async (messages = [], portfolioContext = "") => {
  try {
    // Build messages array for Groq API
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

    // Call Groq API
    const content = await callGroqAPI(formattedMessages);

    return content || "לא התקבלה תשובה תקינה.";
  } catch (error) {
    console.error("Groq AI Error:", error);

    // Provide helpful error messages
    if (error.message.includes("VITE_GROQ_API_KEY")) {
      return "שגיאה: מפתח Groq API לא הוגדר. אנא הוסף VITE_GROQ_API_KEY לקובץ .env";
    }

    return `שגיאה בקבלת תשובה מה-AI (Groq): ${error.message || "שגיאה לא ידועה"}`;
  }
};

/**
 * Parse and validate AI response for chart suggestions
 * @param {string} response - Raw AI response
 * @returns {{success: boolean, data?: any, error?: string}}
 */
export const parseAndValidateChartSuggestions = (response) => {
  try {
    // Try to extract JSON from response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON in code blocks
      jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[0], jsonMatch[1]];
      } else {
        jsonMatch = response.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch = [jsonMatch[0], jsonMatch[1]];
        }
      }
    }

    if (!jsonMatch) {
      return {
        success: false,
        error: 'לא נמצא JSON בתשובה',
        data: getFallbackChartSuggestions()
      };
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Validate against Zod schema
    const validation = validateChartSuggestions(parsed);

    if (!validation.success) {
      console.error('Chart suggestions validation failed:', validation.error);
      return {
        success: false,
        error: `AI Suggestion Failed: ${validation.error}`,
        data: getFallbackChartSuggestions()
      };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    console.error('Error parsing chart suggestions:', error);
    return {
      success: false,
      error: `AI Suggestion Failed: ${error.message}`,
      data: getFallbackChartSuggestions()
    };
  }
};

/**
 * Parse and validate AI response for single chart
 * @param {string} response - Raw AI response
 * @returns {{success: boolean, data?: any, error?: string}}
 */
export const parseAndValidateSingleChart = (response) => {
  try {
    // Try to extract JSON from response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[0], jsonMatch[1]];
      } else {
        jsonMatch = response.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch = [jsonMatch[0], jsonMatch[1]];
        }
      }
    }

    if (!jsonMatch) {
      return {
        success: false,
        error: 'לא נמצא JSON בתשובה',
        data: getFallbackChartConfig()
      };
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Validate against Zod schema
    const validation = validateSingleChart(parsed);

    if (!validation.success) {
      console.error('Single chart validation failed:', validation.error);
      return {
        success: false,
        error: `AI Suggestion Failed: ${validation.error}`,
        data: getFallbackChartConfig()
      };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    console.error('Error parsing single chart:', error);
    return {
      success: false,
      error: `AI Suggestion Failed: ${error.message}`,
      data: getFallbackChartConfig()
    };
  }
};

/**
 * Parse and validate AI response for rebalancing allocation
 * @param {string} response - Raw AI response
 * @returns {{success: boolean, data?: any, error?: string}}
 */
export const parseAndValidateRebalancingAllocation = (response) => {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        success: false,
        error: 'לא נמצא JSON בתשובה'
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate against Zod schema
    const validation = validateRebalancingAllocation(parsed);

    if (!validation.success) {
      console.error('Rebalancing allocation validation failed:', validation.error);
      return {
        success: false,
        error: `AI Suggestion Failed: ${validation.error}`
      };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    console.error('Error parsing rebalancing allocation:', error);
    return {
      success: false,
      error: `AI Suggestion Failed: ${error.message}`
    };
  }
};