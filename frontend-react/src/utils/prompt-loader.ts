import { readFileSync } from 'fs'
import { join } from 'path'

export function loadAnalyticsPrompt(collectedData: any, conversationHistory: any): string {
  const promptPath = join(process.cwd(), 'prompts', 'analytics-system-prompt.txt')
  const systemPromptTemplate = readFileSync(promptPath, 'utf-8')
  
  // Replace placeholders with actual data
  return systemPromptTemplate
    .replace('{{COLLECTED_DATA}}', JSON.stringify(collectedData, null, 2))
    .replace('{{CONVERSATION_HISTORY}}', JSON.stringify(conversationHistory, null, 2))
}
