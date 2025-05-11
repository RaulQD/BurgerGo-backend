import { Column, Entity,OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "./UserEntity";

@Entity({ name: "roles" })
export class RolEntity {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column({ type: "varchar", length: 200 })
  name!: string;  
  @OneToMany(() => UserEntity,(user) => user.rol)
  user!: UserEntity[];
}