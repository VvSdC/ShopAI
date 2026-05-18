export const globalErrhandler = (err, req, res, _next) => {
  const statusCode = err?.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err?.message;
  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err?.stack }),
  });
};

export const notFound = (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
};
