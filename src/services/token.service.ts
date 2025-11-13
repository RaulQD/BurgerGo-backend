import { MoreThan, Repository } from 'typeorm';
import { TokenSecurityService } from './token-security.service';
import { EmailVerificationEntity } from '../entities/EmailVerificationEntity';
import { AppDataBaseSources } from '../config/data.sources';
import { AppError, logger } from '../utils';
import { UserEntity } from '../entities/UserEntity';
import { BAD_REQUEST, NOT_FOUND } from '../constants/http';
import { EmailService } from './email.service';
import { UserService } from './user.service';
import { AuthResponseBuilder } from '../utils/auth-response-builder';
import { JwtConfig } from '../config/jwt.config';

export class TokenEmailService {
  private tokenSecurityService = new TokenSecurityService();
  private emailService = new EmailService();
  private emailVerificationRepository: Repository<EmailVerificationEntity>;
  private userRepository = AppDataBaseSources.getRepository(UserEntity);
  private userService = new UserService();
  private readonly TOKEN_LIFETIME_MINUTES = 10;
  private readonly COOLDOWN_SECONDS = 90;
  constructor() {
    this.emailVerificationRepository = AppDataBaseSources.getRepository(
      EmailVerificationEntity,
    );
  }

  public async createEmailVerificationToken(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['customer'],
      });

      if (!user) throw new AppError('Usuario no encontrado', NOT_FOUND);

      if (user.email_verified) {
        throw new AppError('El correo ya ha sido verificado', BAD_REQUEST);
      }

      await this.invalidatePreviusToken(userId);

      const verificationToken = this.tokenSecurityService.generate6DigitToken();
      await this.saveVerificationToken(user, verificationToken);
      //ENVIAR CORREO
      await this.emailService.sendVerificationEmail(user, verificationToken);
      // Generar token temporal para identificar al usuario sin autenticarlo
      const verificationSessionToken = JwtConfig.signVerificationSessionToken({
        userId: user.id,
        email: user.email,
        type: 'email_verification',
      });

      const response = {
        verification_session_token: verificationSessionToken,
        expires_in: this.TOKEN_LIFETIME_MINUTES * 60,
        cooldown_seconds: this.COOLDOWN_SECONDS,
      };
      return response;
    } catch (error) {
      logger.error(
        `Error creating email verification token for user ${userId}:`,
        error,
      );

      if (error instanceof AppError) {
        throw error; // Re-lanzar AppError específicos
      }
      throw new Error('Error creating email verification token');
    }
  }

  public async verifyToken(token: string, userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) throw new AppError('Usuario no encontrado', NOT_FOUND);

    //BUSCAR EL TOKEN ACTIVO PARA EL USUARIO
    const emailVerification = await this.emailVerificationRepository.findOne({
      where: {
        verificationToken: token,
        verified: false,
        expired_at: MoreThan(new Date()),
      },
      relations: ['user', 'user.customer', 'user.rol'],
    });
    if (!emailVerification)
      throw new AppError('Token inválido o expirado', BAD_REQUEST);

    //2. marcar el token como verificado
    await this.emailVerificationRepository.update(
      { id: emailVerification.id },
      { verified: true },
    );
    //3. actualizar el usuario como verificado
    await this.userRepository.update(
      { id: emailVerification.user.id },
      { email_verified: true },
    );
    return AuthResponseBuilder.buildAuthResponse(emailVerification.user);
  }
  public async resendVerificationToken(email: string) {
    try {
      //1. verificar que el usuario existe
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
        relations: ['customer'],
      });
      if (!user) throw new AppError('Usuario no encontrado', NOT_FOUND);
      //2. verificar que el usuario no este verificado
      if (user.email_verified)
        throw new AppError('El correo ya ha sido verificado', BAD_REQUEST);

      //3. verificar si un token todavia no esta verificado
      const activeToken = await this.emailVerificationRepository.findOne({
        where: {
          user: { id: user.id },
          verified: false,
          expired_at: MoreThan(new Date()),
        },
      });
      if (activeToken) {
        const remainingtimesMs = activeToken.expired_at.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingtimesMs / 60000);
        throw new AppError(
          `Ya se envio un código de verificación. Por favor revisa tu correo o espera ${remainingMinutes} minuto(s) para volver a solicitar uno nuevo.`,
          BAD_REQUEST,
        );
      }
      //4. verificar el cooldown para evitar reenvios seguidos)
      const cooldownSeconds = 90;
      const recentToken = await this.emailVerificationRepository.findOne({
        where: {
          user: { id: user.id },
          expired_at: MoreThan(new Date(Date.now() - cooldownSeconds * 1000)),
        },
      });

      if (recentToken) {
        const remainingSeconds = Math.ceil(
          (recentToken.created_at.getTime() +
            cooldownSeconds * 1000 -
            Date.now()) /
            1000,
        );
        throw new AppError(
          `Debes esperar ${remainingSeconds} segundos antes de reenviar otro código`,
          BAD_REQUEST,
        );
      }
      //5. invalidar tokens anteriores
      await this.emailVerificationRepository.update(
        {
          user: { id: user.id },
          verified: false,
        },
        { expired_at: new Date() },
      );
      //6. crear nuevo token
      const verificationToken = this.tokenSecurityService.generate6DigitToken();
      //7. configurar expiración del token(10 MIN)
      const tokenLifetimeMinutes = 10;
      const expiredDate = new Date(
        Date.now() + tokenLifetimeMinutes * 60 * 1000,
      );
      //6. guardar en la base de datos
      const emailVerification = new EmailVerificationEntity();
      emailVerification.verificationToken = verificationToken;
      emailVerification.expired_at = expiredDate;
      emailVerification.user = user;
      await this.emailVerificationRepository.save(emailVerification);
      //7. enviar email con el token
      await this.emailService.sendVerificationEmail(user, verificationToken);
      const token_expires_in = tokenLifetimeMinutes * 60;
      const response = {
        message:
          'Correo de verificación reenviado. Por favor revisa tu bandeja de entrada.',
        cooldown_seconds: cooldownSeconds,
        token_expires_in,
      };
      return response;
    } catch (error) {
      logger.error(
        `Error resending verification token for user ${email}:`,
        error,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error('Error resending verification token');
    }
  }
  public async resendVerificationTokenV2(userId: string) {
    try {
      //1. VERIFICAR QUE EL USUARIO EXISTA.
      const user = await this.userRepository.findOne({
        where: {
          id: userId,
        },
        relations: ['customer'],
      });
      if (!user) throw new AppError('El usuario no existe', NOT_FOUND);
      //2. VERIFICAR QUE EL USUARIO NO ESTE VERIFICADO.
      if (user.email_verified) {
        throw new AppError('El correo ya ha sido verificado.', BAD_REQUEST);
      }
      //3. VERIFICAR EL COOLDOWN PARA EVITAR REENVIOS SEGUIDOS.
      const recentToken = await this.emailVerificationRepository.findOne({
        where: {
          user: { id: user.id },
          created_at: MoreThan(
            new Date(Date.now() - this.COOLDOWN_SECONDS * 1000),
          ),
        },
        order: { created_at: 'DESC' },
        select: [
          'id',
          'created_at',
          'verificationToken',
          'expired_at',
          'verified',
        ],
      });
      if (recentToken) {
        const timeSinceLastToken =
          Date.now() - recentToken.created_at.getTime();
        const remainingSeconds = Math.ceil(
          (this.COOLDOWN_SECONDS * 1000 - timeSinceLastToken) / 1000,
        );
        throw new AppError(
          `Debes esperar ${remainingSeconds} segundos antes de reenviar otro código.`,
          BAD_REQUEST,
        );
      }
      //4. INVALIDAR TOKENS ANTERIORES.
      await this.invalidatePreviusToken(user.id);
      //5. CREAR NUEVO TOKEN.
      const verificationToken = this.tokenSecurityService.generate6DigitToken();
      //6. GUARDAR EL TOKEN EN LA BASE DE DATOS
      await this.saveVerificationToken(user, verificationToken);
      //7. ENVIAR EMAIL CON EL TOKEN.
      await this.emailService.sendVerificationEmail(user, verificationToken);
      //8- GENERAR UN NUEVO TOKEN DE SESIÓN DE VERIFICACIÓN.
      const verificationSessionToken = JwtConfig.signVerificationSessionToken({
        userId: user.id,
        email: user.email,
        type: 'email_verification',
      });
      const response = {
        verification_session_token: verificationSessionToken,
        expires_in: this.TOKEN_LIFETIME_MINUTES * 60,
        cooldown_seconds: this.COOLDOWN_SECONDS,
      };
      return response;
    } catch (error) {
      logger.error(
        `Error resending verification token for user ${userId}:`,
        error,
      );
      if (error instanceof AppError) {
        throw error;
      }
      // Lanzar el error original para debugging
      logger.error('Original error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error instanceof Error
        ? error
        : new Error('Error resending verification token');
    }
  }
  private async invalidatePreviusToken(userId: string) {
    await this.emailVerificationRepository.update(
      { user: { id: userId }, verified: false },
      { expired_at: new Date() },
    );
  }
  private async saveVerificationToken(
    user: UserEntity,
    verificationToken: string,
  ): Promise<EmailVerificationEntity> {
    const expiredDate = new Date(
      Date.now() + this.TOKEN_LIFETIME_MINUTES * 60 * 1000,
    );
    const emailVerification = new EmailVerificationEntity();
    emailVerification.verificationToken = verificationToken;
    emailVerification.expired_at = expiredDate;
    emailVerification.user = user;

    const response =
      await this.emailVerificationRepository.save(emailVerification);
    return response;
  }
}
