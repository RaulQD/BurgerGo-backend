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

export class TokenEmailService {
  private tokenSecurityService = new TokenSecurityService();
  private emailService = new EmailService();
  private emailVerificationRepository: Repository<EmailVerificationEntity>;
  private userRepository = AppDataBaseSources.getRepository(UserEntity);
  private userService = new UserService();

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

      //1. invalidar tokens anteriores
      await this.emailVerificationRepository.update(
        { user: { id: userId }, verified: false },
        { expired_at: new Date() },
      );
      //2. crear nuevo token
      const verificationToken = this.tokenSecurityService.generate6DigitToken();
      //3. configurar expiración del token
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() + 10); // Token válido por 10 minutos

      //4. guardar en la base de datos
      const emailVerification = new EmailVerificationEntity();
      emailVerification.verificationToken = verificationToken;
      emailVerification.expired_at = expiredDate;
      emailVerification.user = user;

      await this.emailVerificationRepository.save(emailVerification);
      await this.emailService.sendVerificationEmail(user, verificationToken);
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

  public async verifyToken(token: string) {
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

      const recentToken = await this.emailVerificationRepository.findOne({
        where: {
          user: { id: user.id },
          expired_at: MoreThan(new Date(Date.now() - 60000)),
        },
      });
      if (recentToken)
        throw new AppError(
          'Ya se ha enviado un token recientemente. Por favor espera un momento antes de solicitar uno nuevo.',
          BAD_REQUEST,
        );

      //3. invalidar tokens anteriores
      await this.emailVerificationRepository.update(
        {
          user: { id: user.id },
          verified: false,
        },
        { expired_at: new Date() },
      );
      //4. crear nuevo token
      const verificationToken = this.tokenSecurityService.generate6DigitToken();
      //5. configurar expiración del token
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() + 10 * 60 * 1000); // Token válido por 10 minutos
      //6. guardar en la base de datos
      const emailVerification = new EmailVerificationEntity();
      emailVerification.verificationToken = verificationToken;
      emailVerification.expired_at = expiredDate;
      emailVerification.user = user;
      await this.emailVerificationRepository.save(emailVerification);
      //7. enviar email con el token
      await this.emailService.sendVerificationEmail(user, verificationToken);
      return true;
    } catch (error) {
      logger.error(
        `Error resending verification token for user ${email}:`,
        error,
      );

      if (error instanceof AppError) {
        throw error; // Re-lanzar AppError específicos
      }
      throw new Error('Error resending verification token');
    }
  }
}
