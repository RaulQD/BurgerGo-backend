import { QueryRunner, Repository } from "typeorm";
import { UserEntity, UserType } from "../entities/UserEntity";
import { AppDataBaseSources } from "../config/data.sources";
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { ConflictException, NotFoundException } from "../errors/custom.error";
import { RolEntity } from "../entities/RolEntity";
import { CustomerEntity } from "../entities/CustomerEntity";
import { comparePassword, hashPassword } from "../utils/bcrypt-hash";
import { CreateEmployeeDTO } from "../dtos/employee-user/create-employee-user.dto";
import { EmployeeEntity } from "../entities/EmployeeEntity";
import { JwtConfig } from "../config/jwt.config";
import { LoginCustomerDTO } from "../dtos/auth/login-customer.dto";
import { LoginEmployeeDTO } from "../dtos/auth/login-employee.dto";


export class AuthService {
  private userRepository: Repository<UserEntity>;
  private rolRepository: Repository<RolEntity>;
  private customerRepository: Repository<CustomerEntity>;
  private employeeRepository: Repository<EmployeeEntity>;
  private queryRunner: QueryRunner;
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
    if (!user) throw new NotFoundException(`El usuario o la contraseña son incorrectos`);
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) throw new NotFoundException(`El usuario o la contraseña son incorrectos`);
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
    if (!user) throw new NotFoundException(`El usuario o la contraseña son incorrectos`);
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) throw new NotFoundException(`El usuario o la contraseña son incorrectos`);
    //GENERAR EL TOKEN
    const token = JwtConfig.generateToken(user);
    const result = { access_token: token }
    return result;
  }

  public async registerCustomerUser(data: CreateCustomerDTO) {
    //iniciamos la transacción y conexión a la base de datos
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
    try {
      const existingEmail = await this.userRepository.findOne({ where: { email: data.email.toLowerCase() } });
      if (existingEmail) throw new ConflictException(`El correo ${data.email} ya 
      existe`);
      const customerRole = await this.rolRepository.findOne({ where: { id: data.rol_id } })
      if (!customerRole) throw new NotFoundException(`El rol customer no existe`);
      //VALIDAR SI EL TIPO DE USUARIO ES IGUAL AL ROL
      if (customerRole.name !== UserType.CUSTOMER) throw new ConflictException(`El rol ${customerRole.name} no es un rol de cliente`);
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
        address: data.address,
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
    const userBasic = await this.userRepository.findOne(
      { where: { id }, relations: ['rol'] }
    )
    let relations = ['rol']
    if (userBasic?.type === UserType.CUSTOMER) {
      relations.push('customer')
    }
    if (userBasic?.type === UserType.EMPLOYEE) {
      relations.push('employee')
    }
    const user = await this.userRepository.findOne({
      where: { id },
      relations
    })
    const { password, ...userWithoutPassword } = user || {};
    if (!user) throw new NotFoundException(`El usuario nno fue encontrao.`);
    
    return userWithoutPassword;
  }
}