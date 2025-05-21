import { Repository } from "typeorm";
import { CreateRolDto } from "../dtos/roles/rol.dto";
import { RolEntity } from "../entities/RolEntity";
import { AppDataBaseSources } from "../config/data.sources";
import { ConflictException, NotFoundException } from "../errors/custom.error";

export class RolService {
  private rolRepository: Repository<RolEntity>;
  constructor() {
    this.rolRepository = AppDataBaseSources.getRepository(RolEntity);
  }

  public async createRol(roleData: CreateRolDto): Promise<RolEntity> {
    const existingRole = await this.rolRepository.findOneBy({ name: roleData.name });
    if (existingRole) throw new ConflictException(`El rol ${roleData.name} ya existe`);
    const newRol = this.rolRepository.create({ ...roleData });
    // Guardar el nuevo rol en la base de datos
    return await this.rolRepository.save(newRol);
  }
  public async getAllRoles(): Promise<RolEntity[]> {
    const roles = await this.rolRepository.find({
      select: ["id", "name"],
    });
    if (roles.length === 0) throw new NotFoundException("No se encontraron roles");
    return roles;
  }
  public async getRolById(id: string): Promise<RolEntity> { 
    const rol = await this.rolRepository.findOneBy({ id });
    if (!rol) throw new NotFoundException(`No se encontró el rol con id ${id}`);
    return rol;
  }
}