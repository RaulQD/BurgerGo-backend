import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../utils';
import { UNAUTHORIZED } from '../../../../domain/errors/http-status-code';
import { ITokenService } from '../../../../domain/interfaces/token.interface';

//EXTENDER EL REQUEST PARA QUE TENGA UNA PROPIEDAD PERSONALIZADA
declare global {
  namespace Express {
    interface Request {
      verificationSessionV2: {
        userId: string;
        email: string;
        type: string;
      };
    }
  }
}
export const createVerificationSessionMiddleware = (
  tokenService: ITokenService,
) => {
  return function verificationSessionMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    const token =
      (req.headers['x-verification-session'] as string) ||
      (req.headers['verification-session'] as string);
    if (!token) {
      throw new AppError(
        `Token de sesión de verificación no proporcionado`,
        UNAUTHORIZED,
      );
    }
    try {
      const payload = tokenService.verifyVerificationSessionToken(token);

      if (payload.type !== 'email_verification') {
        throw new AppError('Token de verificación inválido', UNAUTHORIZED);
      }
      req.verificationSessionV2 = {
        userId: payload.userId,
        email: payload.email,
        type: payload.type,
      };
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          'La sesión de verificación ha expirado. Solicita un nuevo código.',
          UNAUTHORIZED,
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Token de sesión inválido', UNAUTHORIZED);
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Error al verificar la sesión', UNAUTHORIZED);
    }
  };
};
