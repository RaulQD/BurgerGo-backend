import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "./UserEntity";
import { AddressEntity } from "./AddressEntity";

@Entity({ name: "customers" })
export class CustomerEntity{
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "varchar", length: 200 })
  name: string;
  @Column({ type: "varchar", length: 200 })
  last_name: string;
  @Column({ type: "varchar", length: 200, unique: true, nullable: true })
  dni: string;
  @Column({ type: "varchar", length: 200 })
  phone: string;
  @Column({type: "date", nullable: true })
  birthday: Date;
  @OneToOne(() => UserEntity, (user) => user.customer)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
  @OneToMany(() => AddressEntity, (address) => address.customer, { cascade: true })
  address: AddressEntity[];
}