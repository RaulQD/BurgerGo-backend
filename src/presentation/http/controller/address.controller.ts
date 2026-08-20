import { Request, Response } from 'express';
import { GetAddressCustomerUseCase } from '../../../application/use-cases/customer/address/get-customer-addresses.use-case';
import { CREATED, OK } from '../../../domain/errors/http-status-code';
import { CreateCustomerAddressUseCase } from '../../../application/use-cases/customer/address/create-customer-address.use-case';
import { DeleteCustomerAddressUseCase } from '../../../application/use-cases/customer/address/delete-customer-address.use-case';
import { SetDefaultAddressUseCase } from '../../../application/use-cases/customer/address/set-customer-address.use-case';
import { UpdateCustomerAddressUseCase } from '../../../application/use-cases/customer/address/update-customer-address.use-case';
import { catchError } from '../middlewares/catch-error.middleware';

export class AddressController {
  constructor(
    private getAddressesCustomerUseCase: GetAddressCustomerUseCase,
    private createCustomerAddressUseCase: CreateCustomerAddressUseCase,
    private deleteCustomerAddressUseCase: DeleteCustomerAddressUseCase,
    private setDefaultCustomerAddressUseCase: SetDefaultAddressUseCase,
    private updateCustomerAddressUseCase: UpdateCustomerAddressUseCase,
  ) {}
  public getAddressesCustomer = catchError(
    async (req: Request, res: Response) => {
      const userId = req.user.id;
      const address = await this.getAddressesCustomerUseCase.execute(userId);
      return res.status(OK).json({ data: address });
    },
  );
  public createAddressCustomer = catchError(
    async (req: Request, res: Response) => {
      const userId = req.user.id;
      const {
        houseType,
        department,
        province,
        district,
        address,
        apartmentNumber,
        reference,
        isDefault,
      } = req.body;
      const response = await this.createCustomerAddressUseCase.execute(userId, {
        houseType,
        department,
        province,
        district,
        address,
        apartmentNumber,
        reference,
        isDefault,
      });
      return res
        .status(CREATED)
        .json({ data: response, message: 'Dirección creada exitosamente' });
    },
  );

  public updateAddressCustomer = catchError(
    async (req: Request, res: Response) => {
      const userId = req.user.id;
      const { addressId } = req.params;
      const { address } = req.body;
      const response = await this.updateCustomerAddressUseCase.execute(address);
      return res.status(OK).json({
        message: 'Dirección actualizada correctamente',
        data: response,
      });
    },
  );

  public deleteAddressCustomer = catchError(
    async (req: Request, res: Response) => {
      const userId = req.user.id;
      // La ruta declara /:addressId, siempre un string (Express 5 tipa string | string[] por params repetibles)
      const { addressId } = req.params as { addressId: string };
      await this.deleteCustomerAddressUseCase.execute(addressId, userId);
      return res.status(OK).json({
        message: 'Dirección eliminada correctamente',
        deleteId: addressId,
      });
    },
  );
  public setDefaultAddress = catchError(async (req: Request, res: Response) => {
    const userId = req.user.id;
    // La ruta declara /:addressId, siempre un string (Express 5 tipa string | string[] por params repetibles)
    const { addressId } = req.params as { addressId: string };
    await this.setDefaultCustomerAddressUseCase.execute(addressId, userId);
    return res
      .status(OK)
      .json({ message: 'La dirección predeterminada ha sido cambiada.' });
  });
}
