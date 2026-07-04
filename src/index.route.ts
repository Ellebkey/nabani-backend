import { Router } from 'express';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import envConfig from '@config/config';
import { logger } from '@config/logger';
import '@validations/shared.validation';

export default class IndexRoute {
  public router: Router = Router();

  public constructor() {
    this.initRoutes();
  }

  public initRoutes(): void {
    this.initApi();
    this.router.get('/health-check', (req, res) => {
      res.send('OK');
    });
  }

  initApi = (): void => {
    const env = envConfig.env || 'development';
    const prefix = 'src/';

    const ext = (env === 'development' || env === 'test') ? '.ts' : '.js';
    // Initialize router object

    /** Configure the modules server routes */
    logger.info('Initializing Modules Server Routes...');
    const routes = this.getDirectories(resolve(`${prefix}/routes`));
    routes.forEach((route) => {
      const singleRoute = route.split(ext);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      this.router.use('/', require(`./routes/${singleRoute[0]}${ext}`).default);
    });
  };

  getDirectories = (source: string): string[] => readdirSync(source);
}
