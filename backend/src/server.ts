import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`SAHAAYE Backend server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing HTTP server gracefully');
  server.close(() => process.exit(0));
});
