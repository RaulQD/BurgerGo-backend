import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.typeorm-entity';
import { AddressEntity } from './address.typeorm-entity';

@Entity({ name: 'customers' })
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 200 })
  name: string;
  @Column({ type: 'varchar', length: 200 })
  last_name: string;
  @Column({ type: 'varchar', length: 200, unique: true, nullable: true })
  dni: string;
  @Column({ type: 'varchar', length: 200 })
  phone: string;
  @Column({ type: 'date', nullable: true })
  birthdate: Date | null;
  @CreateDateColumn({ name: 'created_at', select: false })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', select: false })
  updatedAt: Date;
  @OneToOne(() => UserEntity, (user) => user.customer)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  @OneToMany(() => AddressEntity, (address) => address.customer, {
    cascade: false,
  })
  address: AddressEntity[];
}
