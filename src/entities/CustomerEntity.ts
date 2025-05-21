import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "./UserEntity";

@Entity({ name: "customers" })
export class CustomerEntity{
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "varchar", length: 200 })
  name: string;
  @Column({ type: "varchar", length: 200 })
  last_name: string;
  @Column({ type: "varchar", length: 200 })
  address: string;
  @Column({ type: "varchar", length: 200 })
  phone: string;
  @OneToOne(() => UserEntity, (user) => user.customer)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}