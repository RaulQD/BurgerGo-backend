import { CreateRolDto } from '../dtos/roles/rol.dto';
import { Request, Response } from 'express';
import { RolService } from '../services';
import { BaseController } from './base.controller';

export class RolController extends BaseController {
  private rolService: RolService;
  constructor() {
    super();
    this.rolService = new RolService();
  }

  /**
   * @description Obtiene todos los roles
   * @param req - Request object
   * @param res - Response object
   * @returns {Promise<void>}
   */
  public getAllRoles = async (_req: Request, res: Response): Promise<void> => {
    try {
      const roles = await this.rolService.getAllRoles();
      res.status(200).json(roles);
    } catch (error) {
      this.handleError(error, res);
    }
  };
  /**
   * @description Obtiene un rol por su ID
   * @param req - Request object
   * @param res - Response object
   * @returns {Promise<void>}
   */
  public getRolById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const rol = await this.rolService.getRolById(id);
      this.httpResponse.OK(res, 'Rol obtenido correctamente', rol);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * @description Crea un nuevo rol
   * @param req - Request object
   * @param res - Response object
   * @returns {Promise<void>}
   */
  public createRol = async (
    req: Request<{}, {}, CreateRolDto>,
    res: Response,
  ): Promise<void> => {
    try {
      const roleData = req.body;
      const rol = await this.rolService.createRol(roleData);
      this.httpResponse.CREATED(res, 'Rol creado correctamente', rol);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
