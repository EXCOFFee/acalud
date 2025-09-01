import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';

export enum StoreItemType {
  AVATAR = 'avatar',
  THEME = 'theme',
  BADGE = 'badge',
  DECORATION = 'decoration',
  FRAME = 'frame',
  POWER_UP = 'power_up',
}

// Alias para compatibilidad
export const ItemType = StoreItemType;

export enum ItemRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('user_inventory')
export class UserInventory {
  @ApiProperty({ description: 'ID único del inventario' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID único del item en la tienda' })
  @Column()
  itemId: string;

  @ApiProperty({ description: 'Nombre del item' })
  @Column()
  itemName: string;

  @ApiProperty({ description: 'Descripción del item' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: StoreItemType, description: 'Tipo de item' })
  @Column({
    type: 'enum',
    enum: StoreItemType,
  })
  itemType: StoreItemType;

  @ApiProperty({ description: 'Icono o imagen del item' })
  @Column()
  icon: string;

  @ApiProperty({ enum: ItemRarity, description: 'Rareza del item' })
  @Column({
    type: 'enum',
    enum: ItemRarity,
  })
  rarity: ItemRarity;

  @ApiProperty({ description: 'Categoría del item' })
  @Column()
  category: string;

  @ApiProperty({ description: 'Precio pagado por el item' })
  @Column()
  pricePaid: number;

  @ApiProperty({ description: 'Datos específicos del item' })
  @Column({ type: 'jsonb', default: {} })
  itemData: Record<string, any>;

  @ApiProperty({ description: 'Indica si el item está equipado' })
  @Column({ default: false })
  isEquipped: boolean;

  @ApiProperty({ description: 'Fecha de adquisición' })
  @CreateDateColumn()
  purchasedAt: Date;

  // Relaciones
  @ApiProperty({ description: 'ID del usuario propietario' })
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.inventory)
  @JoinColumn({ name: 'userId' })
  user: User;
}
