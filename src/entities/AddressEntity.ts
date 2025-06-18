import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CustomerEntity } from "./CustomerEntity";

export enum houseType {
  HOME = "home",
  WORK = "work",
  OTHER = "other",
}

@Entity({ name: 'address' })
export class AddressEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type:"enum", enum: houseType})
  houseType: string;
  @Column({ type: "varchar", length: 200, nullable: true })
  address: string;
  @ManyToOne(() => CustomerEntity, (customer) => customer.address)
  customer: CustomerEntity;
}