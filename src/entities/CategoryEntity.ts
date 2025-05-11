import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ProductEntity } from "./ProductsEntity";

@Entity({ name: "categories" })
export class CategoryEntity { 
  @PrimaryGeneratedColumn()
  id!: number;
  @Column({ type: "varchar", length: 200 })
  name!: string;
  @OneToMany(() => ProductEntity, (product) => product.category)
  products!: ProductEntity[];
}