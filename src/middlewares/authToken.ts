import { NextFunction, Request, Response } from 'express';
import { JwtConfig } from '../config/jwt.config';
import { AppDataBaseSources } from '../config/data.sources';
import { UserEntity } from '../entities/UserEntity';
import jwt from 'jsonwebtoken';

//EXTENDER EL REQUEST DE EXPRESS PARA QUE TENGA EL USUARIO
declare global {
  namespace Express {
    interface Request {
      user: UserEntity;
    }
  }
}


export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Acceso denegado:Token no proporcionado', code: 'TOKEN_MISSING' });
      return;
    }
    // Aquí puedes verificar el token (por ejemplo, usando JWT)
    const decoded = JwtConfig.verifyToken(token);
    if (!decoded) {
      res.status(401).json({ message: 'Acceso denegado:Token inválido' });
      return;

    }
    const userRespository = AppDataBaseSources.getRepository(UserEntity);
    const user = await userRespository.findOne({ where: { id: decoded.id }, relations: ['rol'] });
    if (!user) {
      res.status(401).json({ message: 'Acceso denegado:Usuario no encontrado', code: 'USER_NOT_FOUND' });
      return;
    }
    //añadir el usuario al request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Acceso denegado:Token expirado', code: 'TOKEN_EXPIRED' });
      return;
    }
    console.error('Error al verificar el token:', error);
    res.status(403).json({
      success: false,
      message: 'Token no válido'
    });
    return;
  }
}