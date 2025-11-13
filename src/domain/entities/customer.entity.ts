import { ValidationError } from '../errors/validation.error';

interface CustomerData {
  name?: string;
  last_name?: string;
  phone?: string;
  dni?: string;
}

export class Customer {
  constructor(
    public readonly id: string,
    public name: string,
    public last_name: string,
    public dni: string,
    public phone: string,
    public user_id: string,
    public birthday?: Date,
  ) {
    this.validateDNI(dni);
    this.validatePhone(phone);
  }
  private validateDNI(dni: string) {
    if (dni.length === 0) {
      throw new ValidationError('DNI debe tener 8 caracteres.');
    }
  }
  private validatePhone(phone: string) {
    if (phone.length !== 9) {
      throw new ValidationError('El telefono debe tener 9 caracretes');
    }
  }
  updateProfile(data: CustomerData) {
    if (data.name) this.name = data.name;
    if (data.last_name) this.last_name = data.last_name;
    if (data.phone) {
      this.validatePhone(data.phone);
      this.phone = data.phone;
    }
    if (data.dni) {
      this.validateDNI(data.dni);
      this.dni = data.dni;
    }
  }
}
