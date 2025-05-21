import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { UserEntity } from "./UserEntity";

@Entity({ name: "employees" })
export class EmployeeEntity {
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
  @Column({ type: "varchar", length: 200,unique: true })
  dni: string;
  @OneToOne(() => UserEntity, (user) => user.employee)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}