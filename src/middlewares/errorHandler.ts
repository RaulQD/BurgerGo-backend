// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { HttpException } from "../errors/custom.error";
// import { CustomError } from "../errors/custom.error";

// Nota el tipo ErrorRequestHandler y el export default
// export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
//   // console.log(err);
//   if (err instanceof HttpException) {
//     res.status(err.status).json({
//       status: err.status,
//       message: err.message,
//     });
//   }
//   console.log(`[Error] ${err.stack || err.message}`);
//   res.status(500).json({
//     status: 500,
//     message: "Internal Server Error",
//     errors: err.message,
//   });
// };