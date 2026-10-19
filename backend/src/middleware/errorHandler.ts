import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  res.status(err.status || 500).json({
    error: isProd ? 'Internal Server Error' : err.message || 'Unknown Error',
    ...(isProd ? {} : { stack: err.stack }),
  });
};
