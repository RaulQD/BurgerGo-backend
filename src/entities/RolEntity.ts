import { Column, Entity,OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "./UserEntity";
import { IRol } from "../interfaces/Rol";

@Entity({ name: "roles" })
export class RolEntity implements IRol{
  @PrimaryGeneratedColumn("uuid")
  id!: string;
  @Column({ type: "varchar", length: 200 })
  name!: string;  
  @OneToMany(() => UserEntity,(user) => user.rol)
  user!: UserEntity[];
}