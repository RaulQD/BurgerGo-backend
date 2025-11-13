import nodemailer from 'nodemailer';
import { UserEntity } from '../entities/UserEntity';
import {
  getVerificationEmailTemplate,
  getWelcomeEmailTemplate,
} from '../shared/templates/notification-email.template';
import dotenv from 'dotenv';
import { logger } from '../utils';
dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor() {
    logger.info('🔧 Configurando EmailService...');
    logger.info('📧 user:', process.env.MAILER_USER);
    logger.info('🔑 Password existe:', !!process.env.MAILER_PASSWORD);
    logger.info('📨 Servicio:', process.env.MAILER_SERVICE);
    logger.info('🚪 Puerto:', process.env.MAILER_PORT);

    this.transporter = nodemailer.createTransport({
      host: process.env.MAILER_SERVICE,
      port: +(process.env.MAILER_PORT ?? 587),
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASSWORD,
      },
      debug: true,
      logger: true,
    });
  }
  async sendVerificationEmail(user: UserEntity, verificationCode: string) {
    const nameComplete = user.customer.name + ' ' + user.customer.last_name[0];
    const verificationEmailParams = {
      nameComplete,
      verificationCode,
    };

    const mailOptions = {
      from: `"BurgerGo" <${process.env.MAILER_EMAIL}>`,
      to: user.email,
      subject: 'Verifica tu cuenta en BurgerGo',
      html: getVerificationEmailTemplate(verificationEmailParams),
    };
    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending verification email to ${user.email}:`, error);
      throw new Error('Error sending verification email');
    }
  }
  async sendWelcomeEmail(user: UserEntity) {
    const mailOptions = {
      from: `"BurgerGo" <${process.env.MAILER_EMAIL}>`,
      to: user.email,
      subject: '¡Bienvenido a BurgerGo!',
      html: getWelcomeEmailTemplate(user.customer.name),
    };
    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending welcome email to ${user.email}:`, error);
      throw new Error('Error sending welcome email');
    }
  }
}
