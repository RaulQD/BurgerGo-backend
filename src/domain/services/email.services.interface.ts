export interface IEmailService {
  sendVerificationEmail(
    to: string,
    name: string,
    verificationCode: string,
  ): Promise<void>;
  sendWelcomeEmail(to: string, name: string): Promise<void>;
}
