import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorMiddleware, notFound, converterErr } from '@errors/index';
import { apiRateLimiter } from '@middlewares/rate-limit.middleware';
import { requestContextMiddleware } from '@middlewares/request-context.middleware';
import { httpLoggerMiddleware } from '@middlewares/http-logger.middleware';
import IndexRoute from '../index.route';
import envConfig from './config';
import { setupSwagger } from './swagger.config';

export default class ExpressServer {
  app: express.Express;

  constructor() {
    this.app = express();
    this.middlewareSetup();
    this.swaggerSetup();
    this.routingSetup();
  }

  private middlewareSetup() {
    // Correlation scope + access logging go first so EVERY request — including
    // rate-limited and failed ones — gets a requestId and an access-log line.
    this.app.use(requestContextMiddleware);
    this.app.use(httpLoggerMiddleware);

    // Keep Express 4's nested query-string parsing (Express 5 defaults to 'simple')
    this.app.set('query parser', 'extended');

    // Setup requests gZip compression
    this.app.use(compression());

    // Setup common security protection
    this.app.use(helmet());

    // Setup Cross Origin access
    this.app.use(cors({
      origin: envConfig.frontendUrl,
      credentials: true,
      // Let the frontend read the correlation id on successful responses too
      // (error bodies already carry it as error.requestId)
      exposedHeaders: ['X-Request-Id'],
    }));

    // Setup requests format parsing (Only JSON requests will be valid)
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());

    this.app.use(cookieParser());
  }

  private swaggerSetup() {
    // Setup Swagger documentation
    if (envConfig.env === 'development') {
      setupSwagger(this.app);
    }
  }

  private routingSetup() {
    // Add to server routes — skip rate limiting in test environment
    if (envConfig.env === 'test') {
      this.app.use('/api', new IndexRoute().router);
    } else {
      this.app.use('/api', apiRateLimiter, new IndexRoute().router);
    }
    this.app.use(converterErr);
    this.app.use(notFound);
    this.app.use(errorMiddleware);
  }
}
