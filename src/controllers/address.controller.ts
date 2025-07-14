import { CREATED, OK } from "../constants/http";
import { AddressDTO } from "../dtos/address/address-dto";
import { AddressService } from "../services/address.service";
import { catchError } from "../utils";
import { Request, Response } from "express";

export class AddressController {
  private addressService: AddressService;
  constructor() {
    this.addressService = new AddressService();
  }

  public createAddress = catchError(async (req: Request<{}, {}, AddressDTO>, res: Response) => {
    const { houseType, address } = req.body;
    // GET THE USER ID FROM THE REQUEST
    const newAddress = await this.addressService.createAddress({ houseType, address }, req.user.id);
    return res.status(CREATED).json({ message: 'Dirección creada correctamente', data: newAddress });
  })

  // method to get user addresses
  public getAddresses = catchError(async (req: Request, res: Response) => {
    // GET TO THE USER ID FROM THE REQUEST
    const userId = req.user.id;
    // CALL TEH SERVICE TO GET THE ADDRESSES
    const addresses = await this.addressService.getAddressByCustomer(userId);

    return res.status(OK).json({ data: addresses });
  })

  public deleteAddress = catchError(async (req: Request, res: Response) => {
    // GET THE ADDRESS ID FROM THE REQUEST PARAMS
    const { addressId } = req.params;
    // GET THE USER ID FROM THE REQUEST
    const userId = req.user.id;

    await this.addressService.deleteAddress(addressId, userId);
    // CALL THE SERVICE TO DELETE THE ADDRESS
    return res.status(OK).json({ message: 'Dirección eliminada correctamente', deleteId: addressId });
  })


}