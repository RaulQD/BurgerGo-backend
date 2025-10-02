import nodemailer from 'nodemailer';
import { UserEntity } from '../entities/UserEntity';
import {
  getVerificationEmailTemplate,
  getWelcomeEmailTemplate,
} from '../shared/templates/notification-email.template';
import dotenv from 'dotenv';
dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor() {
    console.log('🔧 Configurando EmailService...');
    console.log('📧 user:', process.env.MAILER_USER);
    console.log('🔑 Password existe:', !!process.env.MAILER_PASSWORD);
    console.log('📨 Servicio:', process.env.MAILER_SERVICE);
    console.log('🚪 Puerto:', process.env.MAILER_PORT);

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
    const verificationUrl = `${process.env.FRONTEND_URL}/account/confirmed-account`;
    const verificationEmailParams = {
      name: user.customer.name,
      verificationCode,
      verificationUrl,
    };

    const mailOptions = {
      from: `"BurgerGo" <${process.env.MAILER_EMAIL}>`,
      to: user.email,
      subject: 'Verifica tu cuenta en BurgerGo',
      html: getVerificationEmailTemplate(verificationEmailParams),
    };
    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      console.error(
        `Error sending verification email to ${user.email}:`,
        error,
      );
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
      console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error(`Error sending welcome email to ${user.email}:`, error);
      throw new Error('Error sending welcome email');
    }
  }
}
