export class User {
  constructor(
    public readonly id: string,
    public email: string,
    public password: string,
    public username: string | null,
    public rol_name: string,
    public rol_id: string,
    public email_verified: boolean,
    public readonly created_at: Date = new Date(),
    public readonly updated_at: Date = new Date(),
  ) {
    this.validateEmail(email);
  }

  private validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Correo electronico inválido');
    }
  }
  verifyEmail() {
    if (this.email_verified) {
      throw new Error('El correo electrónico ya ha sido verificado');
    }
    this.email_verified = true;
  }

  canLogin(): boolean {
    return this.email_verified;
  }
  isAdmin(): boolean {
    return this.rol_name === 'admin';
  }
  isEmployee(): boolean {
    return this.rol_name === 'employee';
  }
  isCustomer(): boolean {
    return this.rol_name === 'customer';
  }
}
