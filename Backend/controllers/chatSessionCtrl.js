import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import {
  listSessions,
  getSessionForUser,
  createSession,
  deleteSession,
} from '../services/chatSessionService.js'

export const listChatSessionsCtrl = asyncHandler(async (req, res) => {
  const sessions = await listSessions(req.userAuthId)
  res.json({ success: true, sessions })
})

export const getChatSessionCtrl = asyncHandler(async (req, res) => {
  const session = await getSessionForUser(req.userAuthId, req.params.id)
  if (!session) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  res.json({
    success: true,
    session: {
      id: String(session._id),
      title: session.title,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    },
  })
})

export const createChatSessionCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userAuthId).select('fullname')
  const session = await createSession(req.userAuthId, user?.fullname)

  res.status(201).json({
    success: true,
    session: {
      id: String(session._id),
      title: session.title,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    },
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
