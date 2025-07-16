import { Repository } from "typeorm";
import { AddressEntity } from "../entities/AddressEntity";
import { CustomerEntity } from "../entities/CustomerEntity";
import { AppDataBaseSources } from "../config/data.sources";
import { AppError } from "../utils";
import { INTERNAL_SERVER_ERROR, NOT_FOUND } from "../constants/http";
import { UserEntity } from "../entities/UserEntity";
import { AddressDTO } from "../dtos/address/address-dto";


export class AddressService {
  private userRepository: Repository<UserEntity>;
  private addressRepository: Repository<AddressEntity>;
  private customerRepository: Repository<CustomerEntity>;
  constructor() {
    this.userRepository = AppDataBaseSources.getRepository(UserEntity);
    this.addressRepository = AppDataBaseSources.getRepository(AddressEntity);
    this.customerRepository = AppDataBaseSources.getRepository(CustomerEntity);
  }

  public async getAddressByCustomer(userId: string) {

    //fetch addresses from the database or API
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['customer', 'customer.address']
    });
    if (user?.customer.address.length === 0) throw new AppError('No tiene direcciones registradas', NOT_FOUND);

    return user?.customer.address || [];

  }
  public async getAddressById(addressId: string, userId: string) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId },
      relations: ['customer', 'customer.user'],
    });
    if (!address) {
      throw new AppError('Dirección no encontrada', NOT_FOUND);
    }
    if (address.customer.user.id !== userId) {
      throw new AppError('No tienes permiso para ver esta dirección', NOT_FOUND);
    }
    return address;
    // }
    // public async updateAddress(addressId: string, userId: string, updateData: CreateAddressDto) { 
    //   //validar si la dirección existe y pertenece al usuario
    //   const address = await this.getAddressById(addressId, userId);
    //   //

  }
  public async createAddress(createAddressDto: AddressDTO, userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['customer']
    });
    if (!user) throw new AppError('Cliente no encontrado', NOT_FOUND);
    if (!user.customer) throw new AppError('Cliente no tiene un registro', NOT_FOUND);
    const newAddress = this.addressRepository.create({
      houseType: createAddressDto.houseType,
      address: createAddressDto.address.trim(),
      customer: user.customer
    });
    return await this.addressRepository.save(newAddress);

  }
  // public async updateAddress(addressId: string, userId: string, updateData: AddressDTO) {
  //   const address = await this.getAddressById(addressId, userId);
  //   // validar si la dirección existe y pertenece al usuario
  //   if (address.customer.user.id !== userId) {
  //     throw new AppError('No tienes permiso para actualizar esta dirección', NOT_FOUND);
  //   }
    
  // }

  public async deleteAddress(addressId: string, userId: string) {
    const address = await this.getAddressById(addressId, userId);
    const result = await this.addressRepository.delete(address);
    if (result.affected === 0) {
      throw new AppError('Falló al eliminar la dirección', INTERNAL_SERVER_ERROR);
    }
    return result;

  }

}