import { QueryRunner } from "typeorm";
import { CreateEmployeeDTO } from "../dtos";
import { UserEntity, UserType } from "../../../entities/UserEntity";
import { AppDataBaseSources } from "../../../config/data.sources";
import { RolEntity } from "../../../entities/RolEntity";
import { AppError, hashPassword } from "../../../utils";
import { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR } from "../../../constants/http";
import { EmployeeEntity } from "../../../entities";


export class EmployeeService {
  private userRepository = AppDataBaseSources.getRepository(UserEntity);
  private rolRepository = AppDataBaseSources.getRepository(RolEntity);
  private employeeRepository = AppDataBaseSources.getRepository(EmployeeEntity);


  constructor() {
    this.userRepository = AppDataBaseSources.getRepository(UserEntity);
    this.rolRepository = AppDataBaseSources.getRepository(RolEntity);
    this.employeeRepository = AppDataBaseSources.getRepository(EmployeeEntity);
  }

  public async createEmployee(data: CreateEmployeeDTO) {
    // 1. Validaciones SIN transacción
    await this.validateEmployeeData(data);
    // 2. Operaciones de base de datos CON transacción
    return await this.createEmployeeWithTransaction(data);
  
  }

  private async validateEmployeeData(data: CreateEmployeeDTO) {
    // Validar email y username
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: data.email },
        { username: data.username }
      ],
    });

    if (existingUser) throw new AppError("El email o el nombre de usuario ya están en uso", CONFLICT);

    // Validar que el rol existe
    const existingRole = await this.rolRepository.findOne({
      where: { id: data.rol_id }
    });

    if (!existingRole) throw new AppError("El rol especificado no existe", BAD_REQUEST);

    // Validar DNI
    const existingEmployeeWithDNI = await this.employeeRepository.findOne({
      where: { dni: data.dni }
    });

    if (existingEmployeeWithDNI) throw new AppError(`El DNI ${data.dni} ya existe`, CONFLICT);


    return existingRole; // Retornamos el rol para usarlo después
  }
  private async createEmployeeWithTransaction(data: CreateEmployeeDTO) {
    const queryRunner: QueryRunner = AppDataBaseSources.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      // Obtener el rol (ya validado anteriormente)
      const role = await queryRunner.manager.findOne(RolEntity, {
        where: { id: data.rol_id }
      });
      // Hashear la contraseña
      const hashedPassword = await hashPassword(data.password);
      // Crear el usuario
      const user = queryRunner.manager.create(UserEntity, {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        type: UserType.EMPLOYEE,
        rol: role!
      })
      // Guardar el usuario
      const { password, ...savedUser } = await queryRunner.manager.save(UserEntity, user);
      // Crear el empleado
      const employee = queryRunner.manager.create(EmployeeEntity, {
        name: data.name,
        last_name: data.last_name,
        phone: data.phone,
        address: data.address,
        dni: data.dni,
        user: savedUser,
      });
      // Guardar el empleado
      const result = await queryRunner.manager.save(EmployeeEntity, employee);
      // Confirmar la transacción
      await queryRunner.commitTransaction();
      return { id: result.id }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error en transacción:", error);
      throw new AppError("Error al crear el empleado en la base de datos", INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }
}