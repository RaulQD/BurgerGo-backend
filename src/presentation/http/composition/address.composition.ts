import { DataSource } from 'typeorm';
import {
  AddressRepository,
  CustomerRepository,
} from '../../../infrastructure/repositories';
import {
  AddressEntity,
  CustomerEntity,
} from '../../../infrastructure/database/typeorm/entities';
import { AddressController } from '../controller/address.controller';
import { GetAddressCustomerUseCase } from '../../../application/use-cases/customer/address/get-customer-addresses.use-case';
import { CreateCustomerAddressUseCase } from '../../../application/use-cases/customer/address/create-customer-address.use-case';
import { DeleteCustomerAddressUseCase } from '../../../application/use-cases/customer/address/delete-customer-address.use-case';
import { SetDefaultAddressUseCase } from '../../../application/use-cases/customer/address/set-customer-address.use-case';
import { UpdateCustomerAddressUseCase } from '../../../application/use-cases/customer/address/update-customer-address.use-case';

export const composeAddressController = (dataSource: DataSource) => {
  const addressRepository = new AddressRepository(
    dataSource.getRepository(AddressEntity),
  );
  const customerRepository = new CustomerRepository(
    dataSource.getRepository(CustomerEntity),
  );

  const getAddressesCustomerUseCase = new GetAddressCustomerUseCase(
    addressRepository,
    customerRepository,
  );
  const createCustomerUseCase = new CreateCustomerAddressUseCase(
    addressRepository,
    customerRepository,
  );
  const updateCustomerAddressUseCase = new UpdateCustomerAddressUseCase(
    addressRepository,
    customerRepository,
  );
  const deleteCustomerUseCase = new DeleteCustomerAddressUseCase(
    addressRepository,
    customerRepository,
  );
  const setDefaultCustomerAddressUseCase = new SetDefaultAddressUseCase(
    addressRepository,
    customerRepository,
  );
  const addressController = new AddressController(
    getAddressesCustomerUseCase,
    createCustomerUseCase,
    deleteCustomerUseCase,
    setDefaultCustomerAddressUseCase,
    updateCustomerAddressUseCase,
  );
  return { addressController };
};
