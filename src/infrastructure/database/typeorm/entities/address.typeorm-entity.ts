import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.typeorm-entity';
import { HouseType } from '../../../../domain/entities/address.entity';

@Entity({ name: 'address' })
export class AddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  houseType: HouseType;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  // Ubigeo (útil para saber si el restaurante llega a esa zona)
  @Column({ type: 'varchar', length: 50, nullable: true })
  department: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  district: string;

  // Dirección principal (que puede venir de Google Maps)
  @Column({ type: 'varchar', length: 250, nullable: true })
  address: string;

  // Detalles que Google Maps no sabe
  @Column({ type: 'varchar', length: 50, nullable: true })
  apartmentNumber: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  reference: string;

  // Coordenadas exactas para el motorizado
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;
  @CreateDateColumn({ name: 'created_at', select: false })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', select: false })
  updatedAt: Date;
  @ManyToOne(() => CustomerEntity, (customer) => customer.address)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;
}
