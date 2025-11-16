import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';

import { ValidationException } from '../../../common/exceptions/business.exception';
import { Institution, InstitutionStatus } from '../../institution/entities/institution.entity';

/**
 * Servicio que valida que los docentes usen correos pertenecientes a instituciones habilitadas.
 * De esta forma garantizamos que la plataforma solo acepte registros con credenciales oficiales.
 */
@Injectable()
export class InstitutionCredentialService {
  private readonly logger = new Logger(InstitutionCredentialService.name);

  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verifica que el dominio del email enviado para registrar a un docente sea válido.
   * Primero se consulta la configuración estática y luego las instituciones activas en base de datos.
   */
  async ensureTeacherInstitutionalEmail(email: string): Promise<void> {
    const normalizedEmail = email?.trim().toLowerCase() ?? '';
    const domain = this.extractDomain(normalizedEmail);

    if (!domain) {
      throw new ValidationException(
        'Credenciales institucionales inválidas',
        { email: ['El correo electrónico no contiene un dominio institucional válido.'] },
        '/auth/register',
      );
    }

    if (this.isDomainAllowedByConfiguration(domain)) {
      this.logger.debug(`Dominio docente permitido por configuración: ${domain}`);
      return;
    }

    const institutions = await this.institutionRepository.find({
      where: { status: In([InstitutionStatus.ACTIVE, InstitutionStatus.TRIAL]) },
      select: ['id', 'name', 'domain', 'allowedEmailDomains', 'allowSelfRegistration'],
    });

    const domainMatchesInstitution = institutions.some((institution) => {
      if (!institution.allowSelfRegistration) {
        return false;
      }

      const normalizedInstitutionDomain = institution.domain?.toLowerCase().trim();
      const allowedDomains = this.normalizeAllowedDomains(institution.allowedEmailDomains);

      const matchesPrimaryDomain = Boolean(
        normalizedInstitutionDomain && normalizedInstitutionDomain === domain,
      );

      const matchesAllowedList = allowedDomains.includes(domain);

      return matchesPrimaryDomain || matchesAllowedList;
    });

    if (domainMatchesInstitution) {
      return;
    }

    throw new ValidationException(
      'Credenciales institucionales inválidas',
      { email: [`El dominio '${domain}' no está habilitado para el registro de docentes.`] },
      '/auth/register',
    );
  }

  /**
   * Obtiene el dominio a partir del email entregado.
   */
  private extractDomain(email: string): string {
    const [, domain = ''] = email.split('@');
    return domain.trim().toLowerCase();
  }

  /**
   * Determina si el dominio está permitido explícitamente por configuración.
   * Permite habilitar dominios sin depender de la base de datos en entornos controlados.
   */
  private isDomainAllowedByConfiguration(domain: string): boolean {
    const raw = this.configService.get<string>('TEACHER_ALLOWED_DOMAINS', '');

    if (!raw) {
      return false;
    }

    const configuredDomains = raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    return configuredDomains.includes(domain);
  }

  /**
   * Normaliza la lista de dominios permitidos almacenada por cada institución.
   */
  private normalizeAllowedDomains(domains: unknown): string[] {
    if (!Array.isArray(domains)) {
      return [];
    }

    return domains
      .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
      .filter(Boolean);
  }
}
