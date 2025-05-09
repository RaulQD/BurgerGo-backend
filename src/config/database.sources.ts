import { join } from "path";
import { DataSource } from "typeorm";

export const AppDataBaseSources = new DataSource ({
  type:'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'sysburger',
  synchronize: true,
  logging: true,
  entities: []
})