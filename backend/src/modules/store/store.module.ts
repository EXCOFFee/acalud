import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './controllers/store.controller';
import { StoreService } from './services/store.service';
import { StoreItem } from './entities/store-item.entity';
import { UserPurchase } from './entities/user-purchase.entity';
import { User } from '../users/user.entity';

/**
 * Módulo del Sistema de Tienda Cosmética
 * 
 * Encapsula toda la funcionalidad relacionada con:
 * - Gestión de elementos cosméticos
 * - Sistema de compras con monedas de gamificación
 * - Inventario personal de usuarios
 * - Equipamiento de elementos cosméticos
 * - Administración del catálogo de tienda
 * 
 * Casos de Uso Implementados:
 * - CU-38: Comprar elementos cosméticos con monedas
 * - CU-39: Gestionar inventario personal
 * 
 * Dependencias:
 * - UsersModule: Para gestión de usuarios y monedas
 * - AuthModule: Para autenticación y autorización (implícito via guards)
 * 
 * Principios SOLID Aplicados:
 * - Single Responsibility: Módulo específico para funcionalidad de tienda
 * - Open/Closed: Extensible para nuevos tipos de elementos y funcionalidades
 * - Dependency Inversion: Usa inyección de dependencias y abstracciones
 * 
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Module({
  imports: [
    /**
     * Configuración de TypeORM para las entidades del módulo
     * Registra las entidades para que puedan ser inyectadas como repositorios
     */
    TypeOrmModule.forFeature([
      StoreItem,      // Elementos del catálogo de tienda
      UserPurchase,   // Compras e inventario de usuarios
      User            // Usuarios (para validaciones y gestión de monedas)
    ]),
  ],
  
  /**
   * Controladores del módulo
   * Expone los endpoints REST para el sistema de tienda
   */
  controllers: [
    StoreController,
  ],
  
  /**
   * Proveedores de servicios
   * Contiene la lógica de negocio del sistema de tienda
   */
  providers: [
    StoreService,
  ],
  
  /**
   * Servicios exportados
   * Permite que otros módulos utilicen los servicios de tienda
   * Útil para integraciones con otros sistemas (gamificación, reportes, etc.)
   */
  exports: [
    StoreService,
  ],
})
export class StoreModule {}