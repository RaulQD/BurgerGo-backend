import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { RolEntity } from "./RolEntity";
import { IUser } from "../interfaces/User";

@Entity({ name: "users" })
export class UserEntity implements IUser {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column({ type: "varchar", length: 200 })
  name!: string;
  @Column({ type: "varchar", length: 200 })
  last_name!: string;
  @Column({ type: "varchar", length: 200 })
  @Unique(["email"])
  email!: string;
  @Column({ type: "varchar", length: 200 })
  password!: string;
  @Column({ type: "varchar", length: 200, nullable: true })
  imageURL?: string;
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
  @CreateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
  @ManyToOne(() => RolEntity, (rol => rol.user))
  rol!: RolEntity;

  public fullName(): string {
    return `${this.name} ${this.last_name}`;
  }
}