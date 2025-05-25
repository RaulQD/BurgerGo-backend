import { UserEntity } from "../entities/UserEntity";
import { InternalServerErrorException } from "../errors/custom.error";
import { JwtPayload } from "../interfaces/Jwt";
import jwt, { SignOptions } from "jsonwebtoken";



export class JwtConfig {

  private static readonly SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  static generateToken(user: UserEntity): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      rol: user.rol.name,
    }
    console.log('🔍 GENERANDO TOKEN:');
    console.log('- Payload:', payload);
    console.log('- ExpiresIn:', this.EXPIRES_IN);
    console.log('- Fecha actual:', new Date().toISOString());
    try {
      const token = jwt.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN } as SignOptions);
      const decoded = jwt.decode(token) as any;
      console.log('- Token decodificado:', decoded);
      console.log('- Expira en timestamp:', decoded.exp);
      console.log('- Expira en fecha:', new Date(decoded.exp * 1000).toISOString());
      console.log('- Tiempo restante (segundos):', decoded.exp - Math.floor(Date.now() / 1000));
      return token;
    } catch (error) {
      console.error("Error al generar el token JWT:", error);
      throw error;
    }
  }

  static verifyToken(token: string) {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error("JWT_SECRET no está definido en las variables de entorno");
    }
    console.log('🔍 VERIFICANDO TOKEN:');
    console.log('- Fecha actual:', new Date().toISOString());
    console.log('- Timestamp actual:', Math.floor(Date.now() / 1000));
    try {
      const decoded = jwt.verify(token, secretKey);
      console.log('✅ Token verificado correctamente');
      return decoded as JwtPayload;
    } catch (error) {
      console.log('❌ Error al verificar token:', error);
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
      console.error('Error inesperado al verificar JWT:', error);
      throw new InternalServerErrorException("Error interno al verificar el token JWT");

    }
  }
}
