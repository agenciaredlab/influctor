import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const DEMO_USER_ID = 'demo-user'

export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt || 'Eres un experto en marketing digital y redes sociales. Respondes siempre en español, de forma concisa y accionable.',
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type === 'text') return content.text
  return ''
}
