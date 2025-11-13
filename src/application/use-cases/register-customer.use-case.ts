import {
  BAD_REQUEST,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
} from '../../constants/http';
import { Customer } from '../../domain/entities/customer.entity';
import { EmailVerification } from '../../domain/entities/email-verification.entity';
import { User, UserType } from '../../domain/entities/user.entity';
import { IUnitOfWork } from '../../domain/repository/unit-of-work.interface';
import { IRolRepository } from '../../domain/repository/rol.repository.interface';
import { IEmailService } from '../../domain/services/email.services.interface';
import { IPasswordHasher } from '../../domain/services/password-hasher.interface';
import { ITokenService } from '../../domain/services/token.service.interface';
import { AppError } from '../../utils';
import { ValidationError } from '../../domain/errors/validation.error';

export interface RegisterCustomer {
  email: string;
  password: string;
  name: string;
  last_name: string;
  phone: string;
  dni: string;
}
export interface RegisterCustomerOutPut {
  user: User;
  customer: Customer;
  verification_session_token: string;
  expires_in: number;
  cooldown_seconds: number;
}

export class RegisterCustomerUseCase {
  private readonly TOKEN_LIFETIME_MINUTES = 10;
  private readonly COOLDOWN_SECONDS = 90;

  constructor(
    private readonly unitOfWorkFactory: () => IUnitOfWork,
    private readonly rolRepository: IRolRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly emailService: IEmailService,
    private readonly tokenService: ITokenService,
  ) {}
  async execute(data: RegisterCustomer): Promise<RegisterCustomerOutPut> {
    // Crear la instancia de Unit of Work
    const unitOfWork = this.unitOfWorkFactory();

    try {
      // Validaciones previas (fuera de la transacción)
      const existingUser = await unitOfWork.userRepository.findByEmail(
        data.email.toLowerCase(),
      );
      if (existingUser) {
        throw new AppError(
          `El correo ${data.email} ya esta registrado`,
          CONFLICT,
        );
      }

      const existingCustomer = await unitOfWork.customerRepository.findByDNI(
        data.dni,
      );
      if (existingCustomer) {
        throw new AppError(`El DNI ${data.dni} ya esta registrado`, CONFLICT);
      }

      const customerRole = await this.rolRepository.findByName('customer');
      if (!customerRole) {
        throw new AppError('El rol de cliente no fue encontrado', NOT_FOUND);
      }

      // Hashear la contraseña
      const hashedPassword = await this.passwordHasher.hash(data.password);

      // Iniciar transacción
      await unitOfWork.startTransaction();

      // Crear el usuario
      const user = new User(
        this.generateUUID(),
        data.email.toLowerCase(),
        hashedPassword,
        null,
        UserType.CUSTOMER,
        false, // email no verificado
        customerRole.id,
      );

      const savedUser = await unitOfWork.userRepository.save(user);

      // Crear el cliente
      const customer = new Customer(
        this.generateUUID(),
        data.name,
        data.last_name,
        data.dni,
        data.phone,
        savedUser.id,
      );

      const savedCustomer = await unitOfWork.customerRepository.save(customer);

      // Invalidar tokens anteriores
      await unitOfWork.emailVerificationRepository.invalidateUserToken(
        savedUser.id,
      );

      // Generar código de verificación
      const verificationToken = this.generate6DigitToken();
      const expiredAt = new Date(
        Date.now() + this.TOKEN_LIFETIME_MINUTES * 60 * 1000,
      );

      const emailVerification = new EmailVerification(
        this.generateUUID(),
        verificationToken,
        expiredAt,
        false,
        new Date(),
        savedUser.id,
      );

      await unitOfWork.emailVerificationRepository.save(emailVerification);

      // Confirmar transacción
      await unitOfWork.commit();

      // Operaciones fuera de la transacción (envío de email)
      try {
        await this.emailService.sendVerificationEmail(
          savedUser.email,
          savedCustomer.name,
          verificationToken,
        );
      } catch (emailError) {
        // Si falla el email, no revertimos la transacción ya confirmada
        // pero podríamos loguear el error
        console.error('Error sending verification email:', emailError);
        // La cuenta se creó correctamente, solo falló el envío del email
      }

      // Generar token de sesión temporal
      const verificationSessionToken =
        this.tokenService.generateVerificationSessionToken(
          savedUser.id,
          savedUser.email,
          'email_verification',
        );

      const response = {
        user: savedUser,
        customer: savedCustomer,
        verification_session_token: verificationSessionToken,
        expires_in: this.TOKEN_LIFETIME_MINUTES * 60,
        cooldown_seconds: this.COOLDOWN_SECONDS,
      };

      return response;
    } catch (error) {
      // Revertir transacción en caso de error
      await unitOfWork.rollback();

      console.error('❌ ERROR DETALLADO:', error);
      console.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack',
      );

      // Dejar pasar errores de validación de dominio
      if (error instanceof ValidationError) {
        throw new AppError(error.message, BAD_REQUEST);
      }

      // Dejar pasar errores de aplicación
      if (error instanceof AppError) {
        throw error;
      }

      // Error genérico para todo lo demás
      throw new AppError(
        `Error en desarrollo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Siempre liberar recursos
      unitOfWork.release();
    }
  }
  private generateUUID() {
    return crypto.randomUUID();
  }
  private generate6DigitToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
