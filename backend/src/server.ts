import { app } from './app';
import { env } from './config/env';

const PORT = parseInt(env.PORT, 10) || 5001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`SAHAAYE Backend server running on http://0.0.0.0:${PORT} in ${env.NODE_ENV} mode`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing HTTP server gracefully');
  server.close(() => process.exit(0));
});
