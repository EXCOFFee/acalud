/**
 * Validadores personalizados para lógica de negocio
 * Implementa el principio Single Responsibility para validaciones
 */

import { 
  registerDecorator, 
  ValidationOptions, 
  ValidatorConstraint, 
  ValidatorConstraintInterface,
  ValidationArguments 
} from 'class-validator';

/**
 * Validador para contraseñas seguras
 * Requiere: mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password) return false;
    
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }

  defaultMessage(): string {
    return 'La contraseña debe tener al menos 8 caracteres, incluyendo al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * Validador para códigos de invitación
 * Debe ser alfanumérico de 6-12 caracteres
 */
@ValidatorConstraint({ name: 'isValidInviteCode', async: false })
export class IsValidInviteCodeConstraint implements ValidatorConstraintInterface {
  validate(code: string): boolean {
    if (!code) return false;
    
    const isAlphaNumeric = /^[A-Z0-9]+$/.test(code);
    const hasValidLength = code.length >= 6 && code.length <= 12;
    
    return isAlphaNumeric && hasValidLength;
  }

  defaultMessage(): string {
    return 'El código de invitación debe ser alfanumérico (A-Z, 0-9) y tener entre 6 y 12 caracteres';
  }
}

export function IsValidInviteCode(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidInviteCodeConstraint,
    });
  };
}

/**
 * Validador para nombres de usuario (sin caracteres especiales peligrosos)
 */
@ValidatorConstraint({ name: 'isSafeName', async: false })
export class IsSafeNameConstraint implements ValidatorConstraintInterface {
  validate(name: string): boolean {
    if (!name) return false;
    
    // Permitir letras, números, espacios, guiones y apostrofes
    const safePattern = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s\-']+$/;
    const hasValidLength = name.trim().length >= 2 && name.trim().length <= 100;
    const noConsecutiveSpaces = !/\s{2,}/.test(name);
    
    return safePattern.test(name) && hasValidLength && noConsecutiveSpaces;
  }

  defaultMessage(): string {
    return 'El nombre debe contener solo letras, números, espacios, guiones y apostrofes. Debe tener entre 2 y 100 caracteres sin espacios consecutivos';
  }
}

export function IsSafeName(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeNameConstraint,
    });
  };
}

/**
 * Validador para URLs seguras
 */
@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string): boolean {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      const allowedProtocols = ['http:', 'https:'];
      const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
      
      // Verificar protocolo
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return false;
      }
      
      // Verificar dominios bloqueados en producción
      if (process.env.NODE_ENV === 'production') {
        const hostname = urlObj.hostname.toLowerCase();
        if (blockedDomains.some(blocked => hostname.includes(blocked))) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'La URL debe ser válida y usar protocolo HTTP o HTTPS';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}

/**
 * Validador para rangos numéricos
 */
@ValidatorConstraint({ name: 'isInRange', async: false })
export class IsInRangeConstraint implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments): boolean {
    const [min, max] = args.constraints;
    return typeof value === 'number' && value >= min && value <= max;
  }

  defaultMessage(args: ValidationArguments): string {
    const [min, max] = args.constraints;
    return `El valor debe estar entre ${min} y ${max}`;
  }
}

export function IsInRange(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [min, max],
      validator: IsInRangeConstraint,
    });
  };
}

/**
 * Validador para contenido HTML seguro (básico)
 */
@ValidatorConstraint({ name: 'isSafeHtml', async: false })
export class IsSafeHtmlConstraint implements ValidatorConstraintInterface {
  validate(html: string): boolean {
    if (!html) return true; // Permitir vacío
    
    // Detectar scripts y elementos peligrosos
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // onclick, onload, etc.
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<meta/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(html));
  }

  defaultMessage(): string {
    return 'El contenido HTML contiene elementos no permitidos por seguridad';
  }
}

export function IsSafeHtml(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeHtmlConstraint,
    });
  };
}

/**
 * Validador para tamaño de archivos (en bytes)
 */
@ValidatorConstraint({ name: 'isValidFileSize', async: false })
export class IsValidFileSizeConstraint implements ValidatorConstraintInterface {
  validate(fileSize: number, args: ValidationArguments): boolean {
    const [maxSizeInMB] = args.constraints;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    return typeof fileSize === 'number' && fileSize > 0 && fileSize <= maxSizeInBytes;
  }

  defaultMessage(args: ValidationArguments): string {
    const [maxSizeInMB] = args.constraints;
    return `El archivo no debe exceder ${maxSizeInMB}MB`;
  }
}

export function IsValidFileSize(maxSizeInMB: number, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [maxSizeInMB],
      validator: IsValidFileSizeConstraint,
    });
  };
}
