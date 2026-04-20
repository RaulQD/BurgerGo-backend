export interface IEmailService {
  sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
  ): Promise<void>;
  sendWelcomeEmail(to: string, name: string): Promise<void>;
}
