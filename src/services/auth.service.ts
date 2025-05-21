import { Repository } from "typeorm";
import { UserEntity, UserType } from "../entities/UserEntity";
import { AppDataBaseSources } from "../config/data.sources";
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { ConflictException, NotFoundException } from "../errors/custom.error";
import { RolEntity } from "../entities/RolEntity";
import { CustomerEntity } from "../entities/CustomerEntity";
import { hashPassword } from "../utils/bcrypt-hash";
import { CreateEmployeeDTO } from "../dtos/employee-user/employee-user.dto";
import { EmployeeEntity } from "../entities/EmployeeEntity";


export class AuthService {
  private userRepository: Repository<UserEntity>;
  private rolRepository: Repository<RolEntity>;
  private customerRepository: Repository<CustomerEntity>;
  private employeeRepository: Repository<EmployeeEntity>;
  constructor() {
    this.userRepository = AppDataBaseSources.getRepository(UserEntity);
    this.rolRepository = AppDataBaseSources.getRepository(RolEntity);
    this.customerRepository = AppDataBaseSources.getRepository(CustomerEntity);
    this.employeeRepository = AppDataBaseSources.getRepository(EmployeeEntity);
  }

  public async login(email: string, password: string, username: string) {
    const user = await this.userRepository.findOne({
      where: [{ email }, { username }]
    })
    if(!user) throw new NotFoundException(`El usuario no existe`);
    
  }

  public async registerCustomerUser(data: CreateCustomerDTO) {
    const existingEmail = await this.userRepository.findOne({ where: { email: data.email } });
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
    const savedUser = await this.userRepository.save(user);
    const { password, ...userWthoutPassword } = savedUser;
    const customer = this.customerRepository.create({
      name: data.name,
      last_name: data.last_name,
      phone: data.phone,
      address: data.address,
      user: userWthoutPassword,
    })
    const result = await this.customerRepository.save(customer);
    return result;
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
}