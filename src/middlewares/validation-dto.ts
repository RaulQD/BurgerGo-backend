import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { Request, Response, NextFunction } from "express";
import { skip } from "node:test";
import { logger } from "../utils/logger";


export function validateMiddlewareDTO(type: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dtoObject = plainToInstance(type, req.body);
    const errors = await validate(dtoObject as any, { skipMissingProperties: false });
    if (errors.length > 0) {

      const validationErrors = errors.map((error: ValidationError) => ({
        property: error.property,
        constraints: error.constraints,
      }));
      //VALIDATION ERROR IN THE BODY REQUEST
      logger.error({ msa: 'Validation error in the body request', error: validationErrors });

      res.status(400).json({
        status: 400,
        message: "Validation failed",
        errors: validationErrors,
      });
      return;
    }
    req.body = dtoObject;
    next();
  }
}