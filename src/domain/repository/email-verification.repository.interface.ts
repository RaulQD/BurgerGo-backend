import { EmailVerification } from '../entities/email-verification.entity';

export interface IEmailVerificationRepository {
  save(emailVerification: EmailVerification): Promise<EmailVerification>;
  findActiveByUserId(userId: string): Promise<EmailVerification | null>;
  findActiveByToken(token: string): Promise<EmailVerification | null>;
  markAsVerified(id: string): Promise<void>;
  invalidateUserToken(userId: string): Promise<void>;
}
