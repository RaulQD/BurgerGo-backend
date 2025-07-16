import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CustomerEntity } from "./CustomerEntity";

export enum HouseType {
  HOME = "home",
  WORK = "work",
  OTHER = "other",
}

@Entity({ name: 'address' })
export class AddressEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "enum", enum: HouseType })
  houseType: HouseType;
  @Column({ type: "varchar", length: 200, nullable: true })
  address: string;
  @ManyToOne(() => CustomerEntity, (customer) => customer.address)
  @JoinColumn({ name: "customer_id" })
  customer: CustomerEntity;
}