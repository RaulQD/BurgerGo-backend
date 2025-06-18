import { Not, QueryRunner, Repository } from "typeorm";
import { UserEntity, UserType } from "../entities/UserEntity";
import { AppDataBaseSources } from "../config/data.sources";
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { ConflictException, NotFoundException } from "../errors/custom.error";
import { RolEntity } from "../entities/RolEntity";
import { CustomerEntity } from "../entities/CustomerEntity";
import { CreateEmployeeDTO } from "../dtos/employee-user/create-employee-user.dto";
import { EmployeeEntity } from "../entities/EmployeeEntity";
import { JwtConfig } from "../config/jwt.config";
import { LoginCustomerDTO } from "../dtos/auth/login-customer.dto";
import { LoginEmployeeDTO } from "../dtos/auth/login-employee.dto";
import { UpdateCustomerUserDTO } from "../dtos/customer-user/update-customer-user.dto";
import { CONFLICT, NOT_FOUND, UNAUTHORIZED } from "../constants/http";
import { ChangePasswordDTO } from "../dtos/auth/change-password.dto";
import { AppError, comparePassword, hashPassword, logger } from "../utils";


export class AuthService {
  private userRepository: Repository<UserEntity>;
  private rolRepository: Repository<RolEntity>;
  private customerRepository: Repository<CustomerEntity>;
  private employeeRepository: Repository<EmployeeEntity>;
  private queryRunner: QueryRunner;
  private logger = logger;
  constructor() {
    this.userRepository = AppDataBaseSources.getRepository(UserEntity);
    this.rolRepository = AppDataBaseSources.getRepository(RolEntity);
    this.customerRepository = AppDataBaseSources.getRepository(CustomerEntity);
    this.employeeRepository = AppDataBaseSources.getRepository(EmployeeEntity);
    this.queryRunner = AppDataBaseSources.createQueryRunner();

  }

  public async loginCustomer(loginData: LoginCustomerDTO) {
    const { email, password } = loginData
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['rol', 'customer'],
    })
    if (!user) throw new AppError(`El usuario o la contraseña son incorrectos`, UNAUTHORIZED);
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) throw new AppError(`El usuario o la contraseña son incorrectos`, UNAUTHORIZED);
    //GENERAR EL TOKEN
    const token = JwtConfig.generateToken(user);
    const result = { access_token: token }
    return result;
  }
  public async loginEmployee(loginData: LoginEmployeeDTO) {
    const { username, password } = loginData
    const user = await this.userRepository.findOne({
      where: { username: username.toLowerCase() },
      relations: ['rol', 'employee'],
    })
    if (!user) throw new AppError(`El usuario o la contraseña son incorrectos`, UNAUTHORIZED);
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) throw new AppError(`El usuario o la contraseña son incorrectos`, UNAUTHORIZED);
    //GENERAR EL TOKEN
    const access_token = JwtConfig.generateToken(user);
    const result = { access_token }
    return result;
  }

  public async registerCustomerUser(data: CreateCustomerDTO) {
    //iniciamos la transacción y conexión a la base de datos
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
    try {
      const existingEmail = await this.userRepository.findOne({ where: { email: data.email.toLowerCase() } });
      if (existingEmail) throw new AppError(`El correo ${data.email} ya 
      existe`, CONFLICT);
      const customerRole = await this.rolRepository.findOne({ where: { id: data.rol_id } })
      if (!customerRole) throw new AppError(`El rol customer no existe`, NOT_FOUND);
      //VALIDAR SI EL TIPO DE USUARIO ES IGUAL AL ROL
      if (customerRole.name !== UserType.CUSTOMER) throw new AppError(`El rol ${customerRole.name} no es un rol de cliente`, CONFLICT);
      //hashear la contraseña
      const hashedPassword = await hashPassword(data.password);
      const user = this.userRepository.create({
        email: data.email,
        username: null,
        password: hashedPassword,
        type: UserType.CUSTOMER,
        rol: customerRole,
      })
      //guardamos el usuario
      const savedUser = await this.queryRunner.manager.save(user);
      const { password, ...userWthoutPassword } = savedUser;
      const customer = this.customerRepository.create({
        name: data.name,
        last_name: data.last_name,
        phone: data.phone,
        dni: data.dni,
        user: userWthoutPassword,
      })
      //guardamos el cliente
      const result = await this.queryRunner.manager.save(customer);
      //confirmamos la transacción
      await this.queryRunner.commitTransaction();
      //retornamos el cliente
      return result;
    } catch (error) {
      await this.queryRunner.rollbackTransaction();
      console.error('Error al registrar el cliente:', error);
      throw new ConflictException('Error al registrar el cliente');
    } finally {
      await this.queryRunner.release();
    }
  }
  public async registerEmployeeUser(data: CreateEmployeeDTO) {

    //VALIDAMOS SI EL EMAIL YA EXISTE Y SI EL NOMBRE DE USUARIO YA EXISTE
    const existingEmail = await this.userRepository.findOne({ where: [{ email: data.email }, { username: data.username }] });
    if (existingEmail) throw new ConflictException('El email o usuario ya está en uso');
    //VALIDAMOS SI EL ROL EXISTE
    const employeeRole = await this.rolRepository.findOne({ where: { id: data.rol_id } })
    if (!employeeRole) throw new NotFoundException(`El rol employee no existe`);
    //VALIDAMOS SI EL TIPO DE USUARIO ES IGUAL AL ROL
    if (employeeRole.name !== UserType.EMPLOYEE) throw new ConflictException(`El rol ${employeeRole.name} no es un rol de empleado`);
    //hashear la contraseña
    const hashedPassword = await hashPassword(data.password);
    const user = this.userRepository.create({
      email: data.email,
      username: data.username,
      password: hashedPassword,
      type: UserType.EMPLOYEE,
      rol: employeeRole,
    })
    const { password, ...userWithoutPasssowrd } = await this.userRepository.save(user);
    const employee = this.employeeRepository.create({
      name: data.name,
      last_name: data.last_name,
      phone: data.phone,
      address: data.address,
      dni: data.dni,
      user: userWithoutPasssowrd,
    })
    const result = await this.employeeRepository.save(employee);
    return result;
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
          name: true
        }
      }
    });
    if (!userExist) throw new NotFoundException(`El usuario no fue encontrado.`);
    if (!userExist.rol) throw new NotFoundException(`El rol del usuario no fue encontrado.`);

    // Consulta específica según tipo
    const roleName = userExist.rol.name.toLowerCase();
    if (roleName === 'customer') {
      return await this.userRepository.findOne({
        where: { id },
        relations: ['customer'],
        select: {
          id: true,
          email: true,
          customer: {
            id: true,
            name: true,
            last_name: true,
            phone: true,
            address: true,
            dni: true
          }
        }
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
          }
        }
      })
    }

  }
  public async updateCustomerProfile(id: string, updateData: UpdateCustomerUserDTO) {
    const customer = await this.customerRepository.findOne({
      where: { user: { id } },
    });
    if (!customer) throw new AppError(`El usuario no fue encontrado.`, NOT_FOUND);
    // verificar si el dni ya existe en otro usuario
    if (updateData.dni && updateData.dni !== customer.dni) {
      const existingCustomerWithDNI = await this.customerRepository.findOne({
        where: { dni: updateData.dni, id: Not(customer.id) },
      })
      if (existingCustomerWithDNI) {
        throw new AppError(`El DNI ${updateData.dni} ya está en uso por otro usuario.`, CONFLICT);
      }
    }
    //OBJECT.ASSING() permite actualizar las propiedades del objeto customer con los datos de updateData
    Object.assign(customer, updateData);
    const updatedCustomer = await this.customerRepository.save(customer);
    return updatedCustomer;
  }
  public async changePassword(id: string, changePasswordData: ChangePasswordDTO) {

    // VERIFICAR SI EL USUARIO EXISTE
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password'],
    })
    if (!user) throw new AppError('El usuario no fue encontrado.', NOT_FOUND);
    // VERIFICAR QUE LA CONTRASEÑA ACTUAL SEA LA CORRECTA
    const isSameAsOldPassword = await comparePassword(changePasswordData.currentPassword, user.password)
    if (!isSameAsOldPassword) throw new AppError('La contraseña actual es incorrecta.', CONFLICT);

    //verificar que la nueva contraseña y la confirmación de la nueva contraseña sean iguales
    const isNewPasswordMatch = changePasswordData.newPassword === changePasswordData.confirmedPassword;
    if (!isNewPasswordMatch) throw new AppError('La nueva contraseña y su confirmación no coinciden.', CONFLICT);
    const isNewPasswordSameAsOld = await comparePassword(changePasswordData.newPassword, user.password);

    if (isNewPasswordSameAsOld) throw new AppError('La nueva contraseña no puede ser igual a la contraseña actual.', CONFLICT);
    //hashear la nueva contraseña
    const hashedNewPassword = await hashPassword(changePasswordData.newPassword);
    //actualizar la contraseña del usuario
    user.password = hashedNewPassword;
    //retornar el usuario actualizado sin la contraseña
    return await this.userRepository.save(user);

  }
}