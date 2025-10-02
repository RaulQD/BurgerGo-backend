import { NextFunction, Request, Response } from 'express';
import { JwtConfig } from '../config/jwt.config';
import { AppDataBaseSources } from '../config/data.sources';
import { UserEntity } from '../entities/UserEntity';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

//EXTENDER EL REQUEST DE EXPRESS PARA QUE TENGA EL USUARIO
declare global {
    namespace Express {
        interface Request {
            user: UserEntity;
        }
    }
}
interface JWTPayload {
    id: string;
    iat?: number;
    exp?: number;
}
export const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
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
        // Aquí puedes verificar el token (por ejemplo, usando JWT)
        const decoded = JwtConfig.verifyToken(token) as JWTPayload;

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                message: 'Token inválido',
                code: 'TOKEN_INVALID',
            });
        }
        const userRepository = AppDataBaseSources.getRepository(UserEntity);
        const user = await userRepository.findOne({
            where: { id: decoded.id },
            relations: ['rol'],
        });

        if (!user) {
            return res.status(401).json({
                message: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND',
            });
        }
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
