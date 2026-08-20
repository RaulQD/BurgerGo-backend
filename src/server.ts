import { Application } from 'express';
import { logger } from './shared/logger';
import { envConfig } from './infrastructure/config/env.config';

export class Server {
  public readonly app: Application;
  private readonly logger = logger;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Inicia el servidor en el puerto especificado
   * @param port - Puerto en el que escuchará el servidor
   */
  public listen(port: number): void {
    this.app.listen(port, () => {
      this.logger.info(`=========== Server running on port ${port} ==========`);
      this.logger.info(
        `=========== Environment: ${envConfig.app.nodeEnv || 'development'} ==========`,
      );
    });
  }

  /**
   * Cierra el servidor (útil para testing y shutdown graceful)
   */
  public close(): void {
    this.logger.info('Server closing...');
  }
}
