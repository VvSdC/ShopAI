import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import {
  listSessions,
  getSessionMessagesForClient,
  createSession,
  deleteSession,
  mapClientSessionPayload,
  mapSessionMessageForClient,
} from '../services/chatSessionService.js'
import { CHAT_SESSION_CLIENT_PAGE_SIZE } from '../constants/chatLimits.js'

export const listChatSessionsCtrl = asyncHandler(async (req, res) => {
  const sessions = await listSessions(req.userAuthId)
  res.json({ success: true, sessions })
})

export const getChatSessionCtrl = asyncHandler(async (req, res) => {
  const session = await getSessionMessagesForClient(req.userAuthId, req.params.id)
  if (!session) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  res.json({
    success: true,
    session: mapClientSessionPayload(session),
  })
})

export const getChatSessionMessagesCtrl = asyncHandler(async (req, res) => {
  const beforeMessageId = req.query.beforeMessageId
  const limit = parseInt(req.query.limit, 10)

  const page = await getSessionMessagesForClient(req.userAuthId, req.params.id, {
    beforeMessageId: beforeMessageId || undefined,
    limit: Number.isNaN(limit) ? CHAT_SESSION_CLIENT_PAGE_SIZE : limit,
  })

  if (!page) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  res.json({
    success: true,
    messages: page.messages.map(mapSessionMessageForClient),
    messageCount: page.messageCount,
    hasMoreOlder: page.hasMoreOlder,
  })
})

export const createChatSessionCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userAuthId).select('fullname')
  const session = await createSession(req.userAuthId, user?.fullname)

  res.status(201).json({
    success: true,
    session: mapClientSessionPayload({
      id: String(session._id),
      title: session.title,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      messageCount: session.messageCount ?? session.messages.length,
      hasMoreOlder: false,
      messages: session.messages,
    }),
  })
})

export const deleteChatSessionCtrl = asyncHandler(async (req, res) => {
  const deleted = await deleteSession(req.userAuthId, req.params.id)
  if (!deleted) {
    res.status(404)
    throw new Error('Conversation not found')
  }
  res.json({ success: true, message: 'Conversation deleted' })
})
