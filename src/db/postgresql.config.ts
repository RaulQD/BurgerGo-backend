import { DataSource } from "typeorm";
import { AppDataBaseSources } from "../config/data.sources"
import dotenv from 'dotenv';
dotenv.config();
export const postSQLConnection = async (): Promise<DataSource> => {
  try {
    const dataSource = await AppDataBaseSources.initialize();
    console.log(`=========== Postgres DB Connected ==========`)
    console.log(`=========== DB Port: ${process.env.DB_PORT} =========`);
    console.log(`=========== DB Name: ${process.env.DB_NAME} =========`);
    return dataSource;
  } catch (error) {
    console.log(`Error connecting to Postgres DB: ${error}`);
    throw new Error(`Error connecting to Postgres DB: ${error}`);
  }
}