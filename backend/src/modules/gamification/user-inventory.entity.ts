import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';
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
  @IsString({ message: 'El ID del item debe ser un texto válido' })
  @IsNotEmpty({ message: 'El ID del item es obligatorio' })
  itemId: string;

  @ApiProperty({ description: 'Nombre del item' })
  @Column()
  @IsString({ message: 'El nombre del item debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre del item es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  itemName: string;

  @ApiProperty({ description: 'Descripción del item' })
  @Column({ type: 'text' })
  @IsString({ message: 'La descripción debe ser un texto válido' })
  @IsOptional()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description: string;

  @ApiProperty({ enum: StoreItemType, description: 'Tipo de item' })
  @Column({
    type: 'enum',
    enum: StoreItemType,
  })
  @IsEnum(StoreItemType, { message: 'El tipo de item debe ser válido' })
  itemType: StoreItemType;

  @ApiProperty({ description: 'Icono o imagen del item' })
  @Column()
  @IsString({ message: 'El icono debe ser un texto válido' })
  @IsNotEmpty({ message: 'El icono es obligatorio' })
  icon: string;

  @ApiProperty({ enum: ItemRarity, description: 'Rareza del item' })
  @Column({
    type: 'enum',
    enum: ItemRarity,
  })
  @IsEnum(ItemRarity, { message: 'La rareza del item debe ser válida' })
  rarity: ItemRarity;

  @ApiProperty({ description: 'Categoría del item' })
  @Column()
  @IsString({ message: 'La categoría debe ser un texto válido' })
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  category: string;

  @ApiProperty({ description: 'Precio pagado por el item' })
  @Column()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  pricePaid: number;

  @ApiProperty({ description: 'Datos específicos del item' })
  @Column({ type: 'jsonb', default: {} })
  @IsObject({ message: 'Los datos del item deben ser un objeto válido' })
  @IsOptional()
  itemData: Record<string, any>;

  @ApiProperty({ description: 'Indica si el item está equipado' })
  @Column({ default: false })
  @IsBoolean({ message: 'isEquipped debe ser un valor booleano' })
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

  /**
   * 🔍 Validación antes de insertar o actualizar
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateInventoryItem() {
    this.validateItemName();
    this.validatePrice();
    this.validateCategory();
  }

  /**
   * ✅ Validar nombre del item
   */
  private validateItemName() {
    if (!this.itemName || this.itemName.trim().length === 0) {
      throw new BadRequestException('El nombre del item no puede estar vacío');
    }

    if (this.itemName.length < 3 || this.itemName.length > 100) {
      throw new BadRequestException('El nombre debe tener entre 3 y 100 caracteres');
    }

    this.itemName = this.itemName.trim();
  }

  /**
   * ✅ Validar precio
   */
  private validatePrice() {
    if (typeof this.pricePaid !== 'number' || this.pricePaid < 0) {
      throw new BadRequestException('El precio debe ser un número no negativo');
    }

    if (this.pricePaid > 1000000) {
      throw new BadRequestException('El precio es demasiado alto');
    }
  }

  /**
   * ✅ Validar categoría
   */
  private validateCategory() {
    if (!this.category || this.category.trim().length === 0) {
      throw new BadRequestException('La categoría es obligatoria');
    }

    this.category = this.category.trim();
  }

  /**
   * ✅ Verificar si es un item raro
   */
  isRare(): boolean {
    return this.rarity === ItemRarity.RARE || 
           this.rarity === ItemRarity.EPIC || 
           this.rarity === ItemRarity.LEGENDARY;
  }

  /**
   * ✅ Equipar/desequipar item
   */
  toggleEquipped(): void {
    this.isEquipped = !this.isEquipped;
  }

  /**
   * ✅ Obtener valor de reventa estimado
   */
  getResaleValue(): number {
    // 50% del precio pagado
    return Math.floor(this.pricePaid * 0.5);
  }
}
