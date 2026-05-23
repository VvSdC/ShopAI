export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    const issues = result.error?.issues ?? result.error?.errors ?? []
    const errors = issues.map((err) => ({
      field: (err.path || []).join('.') || 'body',
      message: err.message,
    }))
    return res.status(400).json({ message: 'Validation failed', errors })
  }

  req.body = result.data
  next()
}
