import { join } from 'path';
import { DataSource } from 'typeorm';
import { envConfig } from '../../../config/env.config';

export const AppDataBaseSources = new DataSource({
  type: 'postgres',
  host: envConfig.database.host,
  port: envConfig.database.port,
  username: envConfig.database.user,
  password: envConfig.database.password,
  database: envConfig.database.name,
  synchronize: true,
  logging: false,
  // Entidades de TypeORM en Clean Architecture
  entities: [join(__dirname, '../entities/**/*{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
});
