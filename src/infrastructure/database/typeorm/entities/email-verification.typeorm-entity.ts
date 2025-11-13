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
  @Column({ type: 'varchar', length: 255 })
  verification_token: string;
  @Column()
  expired_at: Date;
  @Column({ type: 'boolean', default: false })
  verified: boolean;
  @CreateDateColumn({ name: 'created_at', select: false })
  created_at: Date;
  @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
  user: UserEntity;
}
