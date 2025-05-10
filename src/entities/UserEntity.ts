// import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

// @Entity({ name: "users" })
// export class UserEntity implements IUser {
//   @PrimaryGeneratedColumn()
//   id!: number;
//   @Column({ type: "varchar", length: 200 })
//   name!: string;
//   @Column({ type: "varchar", length: 200, unique: true })
//   last_name!: string;
//   @Column({ type: "varchar", length: 200, unique: true })
//   email!: string;
//   @Column({ type: "varchar", length: 200 })
//   password!: string;
//   @Column({ type: "varchar", length: 200, nullable: true })
//   imageURL?: string;
//   @CreateDateColumn({ name: "created_at" })
//   createdAt!: Date;
//   @CreateDateColumn({ name: "updated_at" })
//   updatedAt!: Date;

//   public fullName(): string {
//     return `${this.name} ${this.last_name}`;
//   }
// }