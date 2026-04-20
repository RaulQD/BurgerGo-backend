export enum HouseType {
  HOME = 'casa',
  WORK = 'trabajo',
  COUPLE = 'pareja',
  OTHER = 'other',
}

export class Address {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public houseType: HouseType,
    public isDefault: boolean,
    public address: string,
    public department: string,
    public province: string,
    public district: string,
    public apartmentNumber?: string,
    public reference?: string,
    public latitude?: number,
    public longitude?: number,
  ) {}
}
