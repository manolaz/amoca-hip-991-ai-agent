const fs = require('fs')
const path = require('path')

/**
 * Loads the analytics system prompt from external file and replaces placeholders
 * @param {any} collectedData - The collected data to inject into the prompt
 * @param {any} conversationHistory - The conversation history to inject into the prompt
 * @returns {string} The formatted system prompt
 */
function loadAnalyticsPrompt(collectedData, conversationHistory) {
  const promptPath = path.join(__dirname, '..', 'prompts', 'analytics-system-prompt.txt')
  const systemPromptTemplate = fs.readFileSync(promptPath, 'utf-8')
  
  // Replace placeholders with actual data
  return systemPromptTemplate
    .replace('{{COLLECTED_DATA}}', JSON.stringify(collectedData, null, 2))
    .replace('{{CONVERSATION_HISTORY}}', JSON.stringify(conversationHistory, null, 2))
}

module.exports = {
  loadAnalyticsPrompt
}
