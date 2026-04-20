import {
  BAD_REQUEST,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
} from '../../../domain/errors/http-status-code';
import { Customer, EmailVerification, User } from '../../../domain/entities';
import { ValidationError } from '../../../domain/errors/validation.error';
import { IRolRepository, IUnitOfWork } from '../../../domain/repository';
import { IEmailService } from '../../../domain/interfaces/email.interface';
import { IPasswordHasher } from '../../../domain/interfaces/password-hasher.interface';
import { ITokenService } from '../../../domain/interfaces/token.interface';
import { AppError } from '../../../domain/errors/app-error.error';
import { logger } from '../../../shared/logger';

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
}

export class RegisterCustomerUseCase {
  private readonly TOKEN_LIFETIME_MINUTES = 60;

  constructor(
    private readonly unitOfWorkFactory: () => IUnitOfWork,
    private readonly rolRepository: IRolRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly emailService: IEmailService,
    private readonly tokenService: ITokenService,
  ) {}
  async execute(data: RegisterCustomer): Promise<RegisterCustomerOutPut> {
    const unitOfWork = this.unitOfWorkFactory();
    let transactionStarted = false;
    try {
      // Validaciones previas (fuera de la transacción)
      const existingUser = await unitOfWork.userRepository.findByEmail(
        data.email.toLowerCase(),
      );
      if (existingUser) {
        if (existingUser.email_verified) {
          throw new AppError(
            `El correo ${data.email} ya esta registrado`,
            CONFLICT,
          );
        }
        throw new AppError(
          `El correo ${data.email} ya esta registrado, por favor verifique su correo`,
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
      transactionStarted = true;
      // Crear el usuario
      const user = new User(
        this.generateUUID(),
        data.email.toLowerCase(),
        hashedPassword,
        null,
        customerRole.name,
        customerRole.id,
        false, // email no verificado
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

      // Generar token de sesión temporal
      const verificationSessionToken =
        this.tokenService.generateVerificationSessionToken(
          savedUser.id,
          savedUser.email,
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
        savedUser.id,
      );

      await unitOfWork.emailVerificationRepository.save(emailVerification);

      // Confirmar transacción
      await unitOfWork.commit();
      transactionStarted = false;
      // Operaciones fuera de la transacción (envío de email)
      try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify?token=${verificationSessionToken}`;
        await this.emailService.sendVerificationEmail(
          savedUser.email,
          savedCustomer.name,
          verificationUrl,
        );
      } catch (emailError) {
        // Si falla el email, no revertimos la transacción ya confirmada
        // pero podríamos loguear el error
        logger.error('Error sending verification email:', emailError);
        // La cuenta se creó correctamente, solo falló el envío del email
      }

      return {
        user: savedUser,
        customer: savedCustomer,
      };
    } catch (error) {
      // Revertir transacción en caso de error
      if (transactionStarted) {
        await unitOfWork.rollback();
      }
      // ── Errores esperados → loguear solo el mensaje limpio ──
      if (error instanceof AppError) {
        logger.warn(`[${error.statusCode}] ${error.message}`); // ← solo mensaje, sin stack
        throw error;
      }

      if (error instanceof ValidationError) {
        logger.warn(`[ValidationError] ${error.message}`); // ← solo mensaje, sin stack
        throw new AppError(error.message, BAD_REQUEST);
      }

      // ── Error inesperado → loguear con stack completo ──
      logger.error(error, 'Error inesperado durante el registro:');
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
}
