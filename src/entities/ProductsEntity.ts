import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CategoryEntity } from "./CategoryEntity";

@Entity({ name: "products" })
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column({ type: "varchar", length: 200 })
  name!: string;
  @ManyToOne(() => CategoryEntity, (category) => category.products)
  category!: CategoryEntity;

}