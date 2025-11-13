import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils';
import { UNAUTHORIZED } from '../constants/http';
import { JwtConfig } from '../config/jwt.config';
//EXTENDER EL REQUEST PARA QUE TENGA UNA PROPIEDAD PERSONALIZADA
declare global {
  namespace Express {
    interface Request {
      verificationSession?: {
        userId: string;
        email: string;
        type: string;
      };
    }
  }
}

export function verificationSessionMiddleware(
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
    const payload = JwtConfig.verificationSessionToken(token);
    if (payload.type !== 'email_verification') {
      throw new AppError('Token de verificación inválido', UNAUTHORIZED);
    }
    req.verificationSession = {
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
}
