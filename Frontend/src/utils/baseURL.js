const PLACEHOLDER_API_URL = /your-service|your-backend|your-api|YOUR-SERVICE|YOUR-BACKEND|YOUR-API/i

function normalizeApiBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

const configured = normalizeApiBaseUrl(process.env.REACT_APP_API_URL)
const fallback = 'http://localhost:2030/shopai'
const baseURL = configured || fallback

if (
  process.env.NODE_ENV === 'production' &&
  (!configured || PLACEHOLDER_API_URL.test(configured))
) {
  // eslint-disable-next-line no-console
  console.error(
    '[ShopAI] REACT_APP_API_URL is missing or still a placeholder. ' +
      'Set it in your host build env (e.g. Netlify → Environment variables) ' +
      'to https://YOUR-ACTUAL-API.onrender.com/shopai and trigger a new deploy.'
  )
}

export default baseURL
