import { Not, QueryRunner, Repository } from 'typeorm';
import { UserEntity } from '../../../entities/UserEntity';
import { AppDataBaseSources } from '../../../config/data.sources';
import { RolEntity } from '../../../entities/RolEntity';
import { CustomerEntity } from '../../../entities/CustomerEntity';
import {
  ChangePasswordDTO,
  CreateCustomerDTO,
  LoginRequestDTO,
  UpdateCustomerUserDTO,
} from '../dto';
import { JwtConfig } from '../../../config/jwt.config';
import { NotFoundException } from '../../../errors/custom.error';
import { EmailVerificationEntity } from '../../../entities/EmailVerificationEntity';
import { AppError, comparePassword, hashPassword } from '../../../utils';
import {
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
} from '../../../constants/http';
import { generate6DigitToken } from '../../../utils/token';
import { EmailService } from '../../../services/email.service';
import { sanitizerUser } from '../../../utils/sanitizer';
import { AuthResponseBuilder } from '../../../utils/auth-response-builder';

export class AuthService {
  private userRepository: Repository<UserEntity>;
  private rolRepository: Repository<RolEntity>;
  private customerRepository: Repository<CustomerEntity>;
  private emailNotificationRepository: Repository<EmailVerificationEntity>;
  constructor() {
    this.userRepository = AppDataBaseSources.getRepository(UserEntity);
    this.rolRepository = AppDataBaseSources.getRepository(RolEntity);
    this.customerRepository = AppDataBaseSources.getRepository(CustomerEntity);
    this.emailNotificationRepository = AppDataBaseSources.getRepository(
      EmailVerificationEntity,
    );
  }

  public async login(loginData: LoginRequestDTO) {
    let user: UserEntity | null = null;
    if (loginData.email) {
      user = await this.userRepository.findOne({
        where: { email: loginData.email.toLowerCase() },
        relations: ['rol', 'customer'],
      });
    } else if (loginData.username) {
      user = await this.userRepository.findOne({
        where: { username: loginData.username.toLowerCase() },
        relations: ['rol', 'employee'],
      });
    }
    if (!user || !user.password)
      throw new AppError(
        `El usuario o la contraseña son incorrectos`,
        UNAUTHORIZED,
      );

    if (user.email_verified === false)
      throw new AppError(
        'Por favor, verifica tu correo electrónico antes de iniciar sesión.',
        UNAUTHORIZED,
      );

    //comprar la contraseña
    const isPasswordValid = await comparePassword(
      loginData.password,
      user.password,
    );
    if (!isPasswordValid)
      throw new AppError(
        `El usuario o la contraseña son incorrectos`,
        UNAUTHORIZED,
      );
    return AuthResponseBuilder.buildAuthResponse(user);
  }

  public async registerCustomerUser(data: CreateCustomerDTO) {
    // Validar datos
    await this.validateCustomerData(data);
    // Crear cliente con transacción
    return await this.createCustomerWithTransaction(data);
  }

  public async getProfile(id: string) {
    // Verificar existencia y tipo
    const userExist = await this.userRepository.findOne({
      where: { id },
      relations: ['rol'],
      select: {
        id: true,
        email: true,
        rol: {
          id: true,
          name: true,
        },
      },
    });
    if (!userExist)
      throw new NotFoundException(`El usuario no fue encontrado.`);
    if (!userExist.rol)
      throw new NotFoundException(`El rol del usuario no fue encontrado.`);

    // Consulta específica según tipo
    const roleName = userExist.rol.name.toLowerCase();
    if (roleName === 'customer') {
      return await this.userRepository.findOne({
        where: { id },
        relations: ['customer', 'customer.address'],
        select: {
          id: true,
          email: true,
          customer: {
            id: true,
            name: true,
            last_name: true,
            phone: true,
            dni: true,
            address: {
              id: true,
              houseType: true,
              address: true,
            },
          },
        },
      });
    } else {
      return await this.userRepository.findOne({
        where: { id },
        relations: ['employee'],
        select: {
          id: true,
          email: true,
          rol: true,
          employee: {
            id: true,
            name: true,
            last_name: true,
          },
        },
      });
    }
  }
  public async updateCustomerProfile(
    id: string,
    updateData: UpdateCustomerUserDTO,
  ) {
    const customer = await this.customerRepository.findOne({
      where: { user: { id } },
    });
    if (!customer)
      throw new AppError(`El usuario no fue encontrado.`, NOT_FOUND);
    // verificar si el dni ya existe en otro usuario
    if (updateData.dni && updateData.dni !== customer.dni) {
      const existingCustomerWithDNI = await this.customerRepository.findOne({
        where: { dni: updateData.dni, id: Not(customer.id) },
      });
      if (existingCustomerWithDNI) {
        throw new AppError(
          `El DNI ${updateData.dni} ya está en uso por otro usuario.`,
          CONFLICT,
        );
      }
    }
    //OBJECT.ASSING() permite actualizar las propiedades del objeto customer con los datos de updateData
    Object.assign(customer, updateData);
    const updatedCustomer = await this.customerRepository.save(customer);
    return updatedCustomer;
  }
  public async changePassword(
    id: string,
    changePasswordData: ChangePasswordDTO,
  ) {
    // VERIFICAR SI EL USUARIO EXISTE
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password'],
    });
    if (!user) throw new AppError('El usuario no fue encontrado.', NOT_FOUND);
    // VERIFICAR QUE LA CONTRASEÑA ACTUAL SEA LA CORRECTA
    const isSameAsOldPassword = await comparePassword(
      changePasswordData.currentPassword,
      user.password,
    );
    if (!isSameAsOldPassword)
      throw new AppError('La contraseña actual es incorrecta.', CONFLICT);

    //verificar que la nueva contraseña y la confirmación de la nueva contraseña sean iguales
    const isNewPasswordMatch =
      changePasswordData.newPassword === changePasswordData.confirmedPassword;
    if (!isNewPasswordMatch)
      throw new AppError(
        'La nueva contraseña y su confirmación no coinciden.',
        CONFLICT,
      );
    const isNewPasswordSameAsOld = await comparePassword(
      changePasswordData.newPassword,
      user.password,
    );

    if (isNewPasswordSameAsOld)
      throw new AppError(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
        CONFLICT,
      );
    //hashear la nueva contraseña
    const hashedNewPassword = await hashPassword(
      changePasswordData.newPassword,
    );
    //actualizar la contraseña del usuario
    user.password = hashedNewPassword;
    //retornar el usuario actualizado sin la contraseña
    return await this.userRepository.save(user);
  }

  private async validateCustomerData(data: CreateCustomerDTO) {
    const existingEmail = await this.userRepository.findOne({
      where: { email: data.email.toLowerCase() },
    });
    if (existingEmail)
      throw new AppError(
        `El correo ${data.email} ya esta registrado`,
        CONFLICT,
      );

    if (!data.rol_id) {
      const customerRole = await this.rolRepository.findOne({
        where: { name: 'customer' },
      });
      if (!customerRole)
        throw new AppError('El rol de cliente no fue encontrado', NOT_FOUND);
      data.rol_id = customerRole.id;
    }

    const existingCustomerWithDNI = await this.customerRepository.findOne({
      where: { dni: data.dni },
    });
    if (existingCustomerWithDNI)
      throw new AppError(`El DNI ${data.dni} ya esta registrado`, CONFLICT);
  }
  private async createCustomerWithTransaction(data: CreateCustomerDTO) {
    const queryRunner: QueryRunner = AppDataBaseSources.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      // Obtener el rol de cliente
      const role = await queryRunner.manager.findOne(RolEntity, {
        where: { id: data.rol_id },
      });
      // Hashear la contraseña
      const hashedPassword = await hashPassword(data.password);

      // Crear el usuario
      const user = new UserEntity();
      user.email = data.email.toLowerCase();
      user.username = null; // No se usa username para clientes
      user.password = hashedPassword;
      user.email_verified = false;
      user.rol = role!;
      // Guardar el usuario
      const savedUser = await queryRunner.manager.save(user);
      // Crear el cliente
      const customer = new CustomerEntity();
      customer.name = data.name;
      customer.last_name = data.last_name;
      customer.phone = data.phone;
      customer.dni = data.dni;
      customer.user = savedUser;
      // Crear el cliente
      const saveCustomer = await queryRunner.manager.save(customer);
      savedUser.customer = saveCustomer;

      //Generar el token de verificación
      const verificationToken = generate6DigitToken();
      const expiredDate = new Date();
      // establecer la fecha de expiración del token en 10 minutos
      expiredDate.setMinutes(expiredDate.getMinutes() + 10);

      //crear la entidad de verificación de email
      const emailVerification = new EmailVerificationEntity();
      emailVerification.verificationToken = verificationToken;
      emailVerification.expired_at = expiredDate;
      emailVerification.user = savedUser;
      // Guardar la verificación de email
      await queryRunner.manager.save(
        EmailVerificationEntity,
        emailVerification,
      );
      // Enviar el email de verificación
      const emailService = new EmailService();
      await emailService.sendVerificationEmail(savedUser, verificationToken);

      await queryRunner.commitTransaction();
      return sanitizerUser(savedUser);
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof AppError) {
        if (error.message.includes('email') || error.message.includes('smtp')) {
          throw new AppError(
            'Error al enviar el correo de verificación. Por favor, intenta nuevamente más tarde.',
            INTERNAL_SERVER_ERROR,
          );
        }
        throw error;
      }
      throw new AppError('Error al crear el cliente', INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

}
