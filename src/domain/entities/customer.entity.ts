import { ValidationError } from '../errors/validation.error';

interface CustomerData {
  name?: string;
  last_name?: string;
  phone?: string;
  dni?: string;
  birthdate?: string;
}

export class Customer {
  constructor(
    public readonly id: string,
    public name: string,
    public last_name: string,
    public dni: string,
    public phone: string,
    public user_id: string,
    public birthdate?: Date,
  ) {
    this.validateDNI(dni);
    this.validatePhone(phone);
  }
  private validateDNI(dni: string) {
    if (!/^[0-9]{8}$/.test(dni)) {
      throw new ValidationError('El DNI debe tener exactamente 8 dígitos.');
    }
  }
  private validatePhone(phone: string) {
    if (!/^[0-9]{9}$/.test(phone)) {
      throw new ValidationError(
        'El teléfono debe tener exactamente 9 dígitos.',
      );
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
    if (data.birthdate) {
      const birthDate = new Date(`${data.birthdate}T12:00:00Z`);
      if (isNaN(birthDate.getTime())) {
        throw new ValidationError(
          'El formato de fecha de nacimiento es inválido (usa YYYY-MM-DD)',
        );
      }
      this.birthdate = birthDate;
    }
  }
}
