import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import { chatCompletion } from '../services/llmService.js'
import { toolDefinitions, executeTool } from '../services/chatTools.js'

const MAX_TOOL_ROUNDS = 3
const MAX_HISTORY = 20

function buildSystemPrompt(userName) {
  return `You are ShopAI Assistant — the friendly and helpful shopping assistant for ShopAI, an online shopping platform.

The customer you are speaking with is named ${userName}.

Rules you MUST follow:
- You are ONLY about ShopAI and shopping. You help with orders, products, coupons, addresses, and general shopping questions.
- NEVER reveal or discuss what AI model, technology, or system is running behind you. If asked, say: "I'm ShopAI's shopping assistant, here to help you with your shopping needs!"
- NEVER make up data. Always use the provided tools to look up real information before answering questions about orders, products, prices, or coupons.
- Format prices in INR using the ₹ symbol.
- Be concise and friendly. Keep responses focused and helpful — no long essays.
- When showing multiple items (orders, products), use a clean numbered list.
- If the user asks something outside shopping (politics, coding, math, etc.), politely redirect: "I'm here to help with your ShopAI shopping experience! Is there anything about orders, products, or your account I can help with?"
- Greet the user by name on the first message.
- When suggesting products, mention they can view full details on the product page.
- For coupon codes, explain how to apply them: enter the code in the cart page before checkout.`
}

export const chatMessageCtrl = asyncHandler(async (req, res) => {
  const { message, history } = req.body

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400)
    throw new Error('Message is required')
  }

  const user = await User.findById(req.userAuthId).select('fullname')
  if (!user) {
    res.status(401)
    throw new Error('User not found')
  }

  const systemMessage = {
    role: 'system',
    content: buildSystemPrompt(user.fullname),
  }

  const trimmedHistory = Array.isArray(history)
    ? history.slice(-MAX_HISTORY).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content || ''),
      }))
    : []

  const messages = [systemMessage, ...trimmedHistory, { role: 'user', content: message.trim() }]

  let response
  let round = 0

  while (round < MAX_TOOL_ROUNDS) {
    round++
    response = await chatCompletion(messages, toolDefinitions)

    const choice = response.choices?.[0]
    if (!choice) throw new Error('No response from AI service')

    const assistantMessage = choice.message

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage)

      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name
        let fnArgs = {}
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          fnArgs = {}
        }

        const result = await executeTool(fnName, req.userAuthId, fnArgs)

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      continue
    }

    return res.json({
      success: true,
      reply: assistantMessage.content || "I'm sorry, I couldn't generate a response. Please try again.",
    })
  }

  const lastChoice = response?.choices?.[0]
  res.json({
    success: true,
    reply:
      lastChoice?.message?.content ||
      "I found some information but had trouble putting it together. Could you try asking in a different way?",
  })
})
