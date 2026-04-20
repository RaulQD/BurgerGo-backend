import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.typeorm-entity';

@Entity('email_verification')
export class EmailVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'text' })
  verification_token: string;
  @Column()
  expired_at: Date;
  @Column({ type: 'boolean', default: false })
  verified: boolean;
  @Column({ type: 'int', default: 0 })
  attempts: number;
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
  @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
  user: UserEntity;
}
