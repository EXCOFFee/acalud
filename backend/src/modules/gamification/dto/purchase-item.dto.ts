import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { StoreItemType, ItemRarity } from '../user-inventory.entity';

/**
 * DTO para la compra de items en la tienda
 * Define la estructura para realizar compras en el sistema de gamificación
 */
export class PurchaseItemDto {
  @ApiProperty({
    description: 'ID único del item en la tienda',
    example: 'avatar_ninja_001',
  })
  @IsString({ message: 'El ID del item debe ser un texto' })
  @IsNotEmpty({ message: 'El ID del item es obligatorio' })
  itemId: string;

  @ApiProperty({
    description: 'Nombre del item',
    example: 'Avatar Ninja Azul',
    maxLength: 100,
  })
  @IsString({ message: 'El nombre del item debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre del item es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  itemName: string;

  @ApiProperty({
    enum: StoreItemType,
    description: 'Tipo de item',
    example: StoreItemType.AVATAR,
  })
  @IsEnum(StoreItemType, {
    message: 'El tipo debe ser: avatar, theme, badge, decoration, frame o power_up',
  })
  itemType: StoreItemType;

  @ApiProperty({
    description: 'Precio del item en monedas',
    example: 150,
    minimum: 1,
  })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(1, { message: 'El precio mínimo es 1 moneda' })
  price: number;

  @ApiProperty({
    description: 'Datos específicos del item (colores, propiedades, etc.)',
    example: {
      color: '#3B82F6',
      style: 'ninja',
      rarity: 'rare',
      preview: 'avatar_ninja_001_preview.png',
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los datos del item deben ser un objeto JSON válido' })
  itemData?: Record<string, any>;

  @ApiProperty({
    description: 'Indica si el item es único (solo se puede comprar una vez)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isUnique debe ser verdadero o falso' })
  isUnique?: boolean;

  @ApiProperty({
    description: 'Descripción del item',
    example: 'Un elegante avatar de ninja con armadura azul brillante',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'Categoría del item',
    example: 'avatars_fantasy',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La categoría debe ser un texto' })
  category?: string;

  @ApiProperty({
    enum: ItemRarity,
    description: 'Rareza del item',
    example: ItemRarity.RARE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemRarity, {
    message: 'La rareza debe ser: common, rare, epic o legendary',
  })
  rarity?: ItemRarity;
}
