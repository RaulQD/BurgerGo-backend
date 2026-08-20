import jwt, { SignOptions } from 'jsonwebtoken';
import { ITokenService } from '../../domain/interfaces/token.interface';
import { CONFLICT } from '../../domain/errors/http-status-code';
import { AppError } from '../../domain/errors/app-error.error';

interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = '1d',
    private readonly temporaryTokenSecret?: string,
    private readonly temporaryTokenExpiration: number = 600,
    private readonly refreshTokenSecret?: string,
    private readonly refreshTokenExpiration?: string,
  ) {}

  verifyVerificationSessionToken(token: string): {
    userId: string;
    email: string;
    type: string;
  } {
    if (!this.temporaryTokenSecret) {
      throw new Error(
        'TEMPORARY_TOKEN_SECRET no está definido en las variables de entorno',
      );
    }
    try {
      const decoded = jwt.verify(token, this.temporaryTokenSecret) as {
        userId: string;
        email: string;
        type: string;
      };
      const response = {
        userId: decoded.userId,
        email: decoded.email,
        type: decoded.type,
      };
      return response;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw error; // Dejar pasar el error original
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw error; // Dejar pasar el error original
      }
      if (error instanceof jwt.NotBeforeError) {
        throw error; // Dejar pasar el error original
      }
      throw new Error('Invalid token');
    }
  }
  generateVerificationSessionToken(
    userId: string,
    email: string,
    type: string,
  ): string {
    if (!this.temporaryTokenSecret) {
      throw new Error(
        'TEMPORARY_TOKEN_SECRET no está definido en las variables de entorno',
      );
    }
    return jwt.sign({ userId, email, type }, this.temporaryTokenSecret, {
      expiresIn: this.temporaryTokenExpiration,
    } as SignOptions);
  }

  generateAccessToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, this.secret, {
      expiresIn: this.expiresIn,
    } as SignOptions);
  }
  verifyAccessToken(token: string): { userId: string; email: string } {
    const secretkey = this.secret;
    if (!secretkey) {
      throw new Error(
        'JWT_SECRET no está definido en las variables de entorno',
      );
    }
    try {
      const decoded = jwt.verify(token, secretkey) as JwtPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      // NO envolver los errores de JWT - dejar que el middleware los maneje
      if (error instanceof jwt.TokenExpiredError) {
        throw error; // Dejar pasar el error original
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw error; // Dejar pasar el error original
      }
      if (error instanceof jwt.NotBeforeError) {
        throw error; // Dejar pasar el error original
      }
      throw new Error('Invalid token');
    }
  }
  generateRefreshToken(userId: string, email: string): string {
    if (!this.refreshTokenSecret) {
      throw new AppError(
        'La clave secreta del Token de Refresco no está definida',
        CONFLICT,
      );
    }
    return jwt.sign({ userId, email }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiration,
    } as SignOptions);
  }
  verifyRefreshToken(token: string): { userId: string; email: string } {
    if (!this.refreshTokenSecret) {
      throw new AppError(
        'La clave secreta del Token de Refresco no está definida',
        CONFLICT,
      );
    }
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      // Manejo de errores similar al verifyAccessToken
      throw new Error('Invalid refresh token');
    }
  }
}
