import { Request, Response } from 'express';
import { catchError } from '../../../utils';
import { UserMapper } from '../../../application/mappers/user.mapper';
import { CREATED, OK } from '../../../domain/errors/http-status-code';
import {
  ChangePasswordUserCase,
  GetProfileUseCase,
  RegisterCustomerUseCase,
  UpdateCustomerUseCase,
} from '../../../application/use-cases';

export class CustomerController {
  constructor(
    private readonly registerCustomerUseCase: RegisterCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly changePasswordUseCase: ChangePasswordUserCase,
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  public createCustomer = catchError(async (req: Request, res: Response) => {
    const userData = req.body;
    const data = await this.registerCustomerUseCase.execute(userData);
    const userResponse = UserMapper.toResponseDto(data.user);
    return res.status(CREATED).json({
      message:
        'Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.',
      data: {
        user: userResponse,
      },
    });
  });
  public getProfile = catchError(async (req: Request, res: Response) => {
    const userId = req.userV2.id;
    const { user, customer } = await this.getProfileUseCase.execute(userId);
    const userResponse = UserMapper.toResponseDto(user, customer);
    return res.status(OK).json(userResponse);
  });

  public updateCustomer = catchError(async (req: Request, res: Response) => {
    const userId = req.userV2.id;
    const updateData = req.body;
    const updatedCustomer = await this.updateCustomerUseCase.execute(
      userId,
      updateData,
    );
    const birthdate = updatedCustomer.birthdate
      ? updatedCustomer.birthdate instanceof Date
        ? updatedCustomer.birthdate.toISOString().split('T')[0]
        : String(updatedCustomer.birthdate).split('T')[0]
      : null;
    return res.status(OK).json({
      message: 'Perfil de cliente actualizado correctamente',
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        last_name: updatedCustomer.last_name,
        phone: updatedCustomer.phone,
        dni: updatedCustomer.dni,
        birthdate,
      },
    });
  });
  public changePassword = catchError(async (req: Request, res: Response) => {
    const userId = req.userV2.id;
    const userData = req.body;
    await this.changePasswordUseCase.execute(userId, userData);
    return res.status(OK).json({
      message: 'La contraseña se cambio exitosamente',
    });
  });
}
