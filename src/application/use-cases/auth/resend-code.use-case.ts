import crypto from 'crypto';
import {
  BAD_REQUEST,
  NOT_FOUND,
} from '../../../domain/errors/http-status-code';
import { EmailVerification } from '../../../domain/entities';
import {
  ICustomerRepository,
  IEmailVerificationRepository,
  IUserRepository,
} from '../../../domain/repository';
import { IEmailService } from '../../../domain/interfaces/email.interface';
import { ITokenService } from '../../../domain/interfaces/token.interface';
import { AppError } from '../../../domain/errors/app-error.error';
import { logger } from '../../../shared/logger';

// Interfaz para la respuesta del use case
export interface ResendCodeResponse {
  cooldown_seconds: number;
}

export class ResendCodeUseCase {
  private readonly TOKEN_LIFETIME_MINUTES = 10;
  private readonly COOLDOWN_SECONDS = 90;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailVerificationRepository: IEmailVerificationRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly emailService: IEmailService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(email: string): Promise<ResendCodeResponse> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('El usuario no existe', NOT_FOUND);
    }
    if (user.email_verified) {
      throw new AppError('El correo ya ha sido verificado.', BAD_REQUEST);
    }

    const activetoken =
      await this.emailVerificationRepository.findActiveByUserId(user.id);
    if (activetoken) {
      const timeSinceLastToken = Date.now() - activetoken.created_at.getTime();
      const cooldownMs = this.COOLDOWN_SECONDS * 1000;
      if (timeSinceLastToken < cooldownMs) {
        const remainingSeconds = Math.ceil(
          (this.COOLDOWN_SECONDS * 1000 - timeSinceLastToken) / 1000,
        );
        throw new AppError(
          `Debes esperar ${remainingSeconds} segundos antes de reenviar otro código.`,
          BAD_REQUEST,
        );
      }
    }
    await this.emailVerificationRepository.invalidateUserToken(user.id);
    const verificationSessionToken =
      this.tokenService.generateVerificationSessionToken(
        user.id,
        user.email,
        'email_verification',
      );
    const expiredAt = new Date(
      Date.now() + this.TOKEN_LIFETIME_MINUTES * 60 * 1000,
    );

    const emailVerification = new EmailVerification(
      this.generateUUID(),
      verificationSessionToken,
      expiredAt,
      false,
      0,
      new Date(),
      user.id,
    );

    await this.emailVerificationRepository.save(emailVerification);
    const customer = await this.customerRepository.findByUserId(user.id);
    const customerName = customer?.name || email.split('@')[0];
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify?token=${verificationSessionToken}`;
      await this.emailService.sendVerificationEmail(
        user.email,
        customerName,
        verificationUrl,
      );
    } catch (emailError) {
      logger.error(
        emailError,
        '[ResendCodeUseCase] Error sending verification email:',
      );
    }
    return {
      cooldown_seconds: this.COOLDOWN_SECONDS,
    };
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }
}
