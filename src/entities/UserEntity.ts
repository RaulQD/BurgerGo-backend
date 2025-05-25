import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { RolEntity } from "./RolEntity";
import { CustomerEntity } from "./CustomerEntity";
import { EmployeeEntity } from "./EmployeeEntity";

export enum UserType {
  ADMIN = "admin",
  EMPLOYEE = "employee",
  CUSTOMER = "customer",
}
@Entity({ name: "users" })
@Unique(["email"])
@Unique(["username"])
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "varchar", length: 200, nullable: true })
  email: string;
  @Column({ type: "varchar", length: 200, nullable: true })
  username: string | null;
  @Column({ type: "varchar", length: 200 })
  password: string;
  @Column({ type: "enum", enum: UserType, default: UserType.CUSTOMER })
  type: UserType;
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
  @ManyToOne(() => RolEntity, (rol => rol.user))
  @JoinColumn({ name: "rol_id" })
  rol: RolEntity;
  @OneToOne(() => CustomerEntity, (customer) => customer.user)
  customer: CustomerEntity;
  @OneToOne(() => EmployeeEntity, (employee => employee.user))
  employee: EmployeeEntity;
}