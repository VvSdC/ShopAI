/**
 * JSDoc types for config/env.js (no runtime import required).
 * @typedef {Object} AppConfig
 * @property {string} nodeEnv
 * @property {boolean} isProduction
 * @property {boolean} isDevelopment
 * @property {boolean} isTest
 * @property {{ port: number, host: string, trustProxy: boolean }} server
 * @property {{ mongoUrl: string }} db
 * @property {{ origin: string, credentials: boolean }} cors
 * @property {{ jwtKey: string, jwtRefreshKey: string, maxSessions: number }} auth
 * @property {{ secretKey: string, webhookSecret: string }} stripe
 * @property {{ url: string, checkoutQueueEnabled: boolean, embeddingSyncQueueEnabled: boolean, runQueueWorkersInApi: boolean }} redis
 * @property {{ deterministicAssist: boolean }} chat
 * @property {{ cloudName: string, apiKey: string, apiSecret: string }} cloudinary
 * @property {{ provider: string, from: string, resendApiKey: string, brevoApiKey: string }} email
 * @property {Object} llm
 * @property {Object} rateLimit
 */

export {}
