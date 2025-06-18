import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { HttpException } from "../errors/custom.error";
import { AppError } from "../utils/AppError";
import { INTERNAL_SERVER_ERROR } from "../constants/http";
import { logger } from "../utils/logger";


const handlerAppError = (res: Response, error: AppError) => {
  res.status(error.statusCode).json({
    message: error.message,
    errorCode: error.errorCode,
  });
}

//Nota el tipo ErrorRequestHandler y el export default
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    handlerAppError(res, error);
    return;
  }
  logger.error(`${error.stack || error.message}`);
  res.status(INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    errors: error.message,
  });
};