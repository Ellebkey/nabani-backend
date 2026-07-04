import http from 'http';
import ExpressServer from '@config/express';
import { SequelizeDB } from '@config/sequelize';
import { RedisDB } from '@config/redis-config';
import { logger } from '@config/logger';

// Database connection instance
const db = new SequelizeDB();
const dbRedis = new RedisDB();

void db.initDataBase();
void dbRedis.initRedis();

// Normalize port number which will expose server
const port = normalizePort(process.env.PORT || 3000);

// Instantiate the expressServer class
const { app } = new ExpressServer();

// Make port available within server
app.set('port', port);

// Create the HTTP Express Server
const server = http.createServer(app);

// Start listening on the specified Port (Default: 3000)
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Port Normalization
function normalizePort(val: number | string): number | string | boolean {
  const currentPort: number = typeof val === 'string' ? parseInt(val, 10) : val;
  if (Number.isNaN(currentPort)) {
    return val;
  }
  if (currentPort >= 0) {
    return currentPort;
  }
  return false;
}

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }
  const bind = typeof port === 'string' ? `Pipe  ${port}` : `Port  ${port}`;
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `Listening on port ${addr?.port ?? port}`;
  logger.info(bind);
}
