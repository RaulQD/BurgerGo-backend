import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.typeorm-entity';

@Entity({ name: 'roles' })
export class RolEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'varchar', length: 200 })
  name!: string;
  @OneToMany(() => UserEntity, (user) => user.rol)
  user!: UserEntity[];
}
