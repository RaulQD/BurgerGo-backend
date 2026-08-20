import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { User } from '../../../../domain/entities/user.entity';
import { VerifyAccessTokenUseCase } from '../../../../application/use-cases';

//EXTENDER EL REQUEST DE EXPRESS PARA QUE TENGA EL USUARIO
declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export const verifyToken = (verifyTokenUseCase: VerifyAccessTokenUseCase) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({
          message: 'Acceso denegado:Token no proporcionado',
          code: 'TOKEN_MISSING',
        });
        return;
      }

      const user = await verifyTokenUseCase.execute(token);
      //añadir el usuario al request
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED',
        });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          message: 'Token inválido',
          code: 'TOKEN_INVALID',
        });
      }
      if (error instanceof jwt.NotBeforeError) {
        return res.status(401).json({
          message: 'Token no válido aún',
          code: 'TOKEN_NOT_ACTIVE',
        });
      }
    }
  };
};

export const requireRoles = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: 'Acceso denegado: Usuario no autenticado',
        code: 'USER_NOT_AUTHENTICATED',
      });
    }
    //Aquí se podrían añadir más validaciones de roles o permisos
    next();
  };
};
