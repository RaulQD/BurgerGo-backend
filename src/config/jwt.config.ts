import { UserEntity } from "../entities/UserEntity";
import { InternalServerErrorException } from "../errors/custom.error";
import { JwtPayload, TokenPair } from "../interfaces/Jwt";
import jwt, { SignOptions } from "jsonwebtoken";



export class JwtConfig {

  private static ACCESS_TOKEN = process.env.ACCESS_TOKEN_SECRET;
  private static REFRESH_TOKEN = process.env.REFRESH_TOKEN_SECRET
  private static EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRY || '24h';
  private static REFRESH_TOKEN_EXPIRED = process.env.REFRESH_TOKEN_EXPIRY || '7d';

  static generateToken(user: UserEntity): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      rol: user.rol?.name
    }
    try {
      const accessToken = jwt.sign(payload, this.ACCESS_TOKEN as string, { expiresIn: this.EXPIRES_IN } as SignOptions);
      // const refreshToken = jwt.sign(payload, this.REFRESH_TOKEN as string, { expiresIn: this.REFRESH_TOKEN_EXPIRED } as SignOptions);
      // return {access_token: accessToken, refresh_token: refreshToken};
      return accessToken;
    } catch (error) {
      throw error;
    }
  }


  static verifyToken(token: string) {
    const secretKey = process.env.ACCESS_TOKEN_SECRET;
    if (!secretKey) {
      throw new Error("JWT_SECRET no está definido en las variables de entorno");
    }

    try {
      const decoded = jwt.verify(token, secretKey);
      return decoded as JwtPayload;
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
      // Solo para errores verdaderamente inesperados
      throw new InternalServerErrorException("Error interno al verificar el token JWT");

    }
  }
}
