import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { RolEntity } from "./RolEntity";
import { Exclude } from "class-transformer";
import { CustomerEntity } from "./CustomerEntity";
import { EmailVerificationEntity } from "./EmailVerificationEntity";
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
  @Exclude()
  password: string;
  @Column({ type: "enum", enum: UserType, default: UserType.CUSTOMER })
  type: UserType;
  @Column({ type: "boolean", default: false })
  email_verified: boolean;
  @CreateDateColumn({ name: "created_at", select: false })
  createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", select: false })
  updatedAt: Date;
  @ManyToOne(() => RolEntity, (rol => rol.user))
  @JoinColumn({ name: "rol_id" })
  rol: RolEntity;
  @OneToOne(() => CustomerEntity, (customer) => customer.user, { cascade: true })
  customer: CustomerEntity;
  @OneToOne(() => EmployeeEntity, (employee) => employee.user, { cascade: true })
  employee: EmployeeEntity;
  @OneToMany(() => EmailVerificationEntity, (emailVerification) => emailVerification.user)
  emailVerification: EmailVerificationEntity[];
}