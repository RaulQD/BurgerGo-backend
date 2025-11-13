import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService } from '../../domain/services/email.services.interface';
import {
  getVerificationEmailTemplate,
  getWelcomeEmailTemplate,
} from '../../shared/templates/notification-email.template';
import { logger } from '../../utils';

export class NodemailerEmailService implements IEmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILER_SERVICE,
      port: +(process.env.MAILER_PORT ?? 587),
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationCode: string,
  ): Promise<void> {
    const nameComplete = name.split(' ')[0];
    console.info(nameComplete);
    const verificationEmailParams = {
      nameComplete,
      verificationCode,
    };
    const mailOptions = {
      from: `"BurgerGo" <${process.env.MAILER_EMAIL}>`,
      to,
      subject: 'Verifica tu cuenta en BurgerGo',
      html: getVerificationEmailTemplate(verificationEmailParams),
    };
    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${to}`);
    } catch (error) {
      console.error(`Error sending verification email to ${to}`, error);
      throw new Error('ERror sending verification email');
    }
  }
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const mailOptions = {
      from: `"BurgerGo <${process.env.MAILER_EMAIL}>`,
      to,
      subject: '¡Bienvenido a BurgerGo!',
      html: getWelcomeEmailTemplate(name),
    };
    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${to}`);
    } catch (error) {
      console.error(`Error sending welcome email to ${to}`, error);
      throw new Error('Error sending welcome email');
    }
  }
}
