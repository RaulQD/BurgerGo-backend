import { AppDataBaseSources } from "../config/data.sources";
import { RolEntity } from "../entities/RolEntity";


export const RolRepository = AppDataBaseSources.getRepository(RolEntity)