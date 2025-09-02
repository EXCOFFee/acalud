/**
 * ✅ GENERADOR DE CÓDIGOS DE INVITACIÓN
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Solo se encarga de generar y validar códigos
 * - OCP: Extensible para diferentes algoritmos de generación
 * - DIP: Puede usar diferentes fuentes de aleatoriedad
 */

import { Injectable } from '@nestjs/common';
import { IInviteCodeGenerator } from '../interfaces';
import { IClassroomRepository } from '../interfaces';

@Injectable()
export class InviteCodeGenerator implements IInviteCodeGenerator {
  private readonly CODE_LENGTH = 8;
  private readonly CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private readonly CODE_EXPIRY_DAYS = 365;
  private readonly MAX_GENERATION_ATTEMPTS = 10;

  constructor(
    private readonly classroomRepository: IClassroomRepository,
  ) {}

  async generateUniqueCode(): Promise<string> {
    let attempts = 0;
    let code: string;

    do {
      code = this.generateRandomCode();
      attempts++;

      // Verificar si el código ya existe
      const existingClassroom = await this.classroomRepository.findByInviteCode(code);
      
      if (!existingClassroom) {
        return code;
      }

      if (attempts >= this.MAX_GENERATION_ATTEMPTS) {
        throw new Error('No se pudo generar un código único después de múltiples intentos');
      }
    } while (attempts < this.MAX_GENERATION_ATTEMPTS);

    throw new Error('Error al generar código de invitación');
  }

  validateCodeFormat(code: string): boolean {
    if (!code || code.length !== this.CODE_LENGTH) {
      return false;
    }

    // Verificar que solo contenga caracteres válidos
    const regex = new RegExp(`^[${this.CODE_CHARSET}]+$`);
    return regex.test(code);
  }

  isCodeExpired(code: string, createdAt: Date): boolean {
    const now = new Date();
    const expiryDate = new Date(createdAt);
    expiryDate.setDate(expiryDate.getDate() + this.CODE_EXPIRY_DAYS);
    
    return now > expiryDate;
  }

  /**
   * Genera un código aleatorio de 8 caracteres
   */
  private generateRandomCode(): string {
    let code = '';
    
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CODE_CHARSET.length);
      code += this.CODE_CHARSET[randomIndex];
    }
    
    return code;
  }

  /**
   * Algoritmo alternativo usando crypto para mayor seguridad
   */
  private generateSecureRandomCode(): string {
    // Implementaría usando crypto.getRandomValues() para mayor seguridad
    // Por ahora usamos Math.random() para simplicidad
    return this.generateRandomCode();
  }
}
