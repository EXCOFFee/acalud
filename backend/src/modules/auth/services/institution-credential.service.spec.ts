import { ValidationException } from '../../../common/exceptions/business.exception';
import { InstitutionCredentialService } from './institution-credential.service';
import { InstitutionStatus } from '../../institution/entities/institution.entity';

describe('InstitutionCredentialService', () => {
  const repositoryMock = { find: jest.fn() };
  const configServiceMock = { get: jest.fn() };
  let service: InstitutionCredentialService;

  beforeEach(() => {
    repositoryMock.find.mockReset();
    configServiceMock.get.mockReset();
    service = new InstitutionCredentialService(
      repositoryMock as any,
      configServiceMock as any,
    );
  });

  it('permite correos docentes configurados explícitamente', async () => {
    configServiceMock.get.mockReturnValue('institucion.edu, colegio.edu');

    await expect(
      service.ensureTeacherInstitutionalEmail('profesora@Colegio.edu'),
    ).resolves.toBeUndefined();

    expect(repositoryMock.find).not.toHaveBeenCalled();
  });

  it('acepta dominios habilitados por una institución activa', async () => {
    configServiceMock.get.mockReturnValue('');
    repositoryMock.find.mockResolvedValue([
      {
        allowSelfRegistration: true,
        domain: 'academia.edu',
        allowedEmailDomains: [],
        status: InstitutionStatus.ACTIVE,
      },
    ]);

    await expect(
      service.ensureTeacherInstitutionalEmail('docente@academia.edu'),
    ).resolves.toBeUndefined();

    expect(repositoryMock.find).toHaveBeenCalledTimes(1);
  });

  it('valida dominios adicionales configurados en la institución', async () => {
    configServiceMock.get.mockReturnValue('');
    repositoryMock.find.mockResolvedValue([
      {
        allowSelfRegistration: true,
        domain: 'instituto.edu',
        allowedEmailDomains: ['externo.edu'],
        status: InstitutionStatus.TRIAL,
      },
    ]);

    await expect(
      service.ensureTeacherInstitutionalEmail('docente@externo.edu'),
    ).resolves.toBeUndefined();
  });

  it('lanza excepción si el correo no contiene dominio', async () => {
    await expect(
      service.ensureTeacherInstitutionalEmail('docente'),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rechaza dominios no habilitados', async () => {
    configServiceMock.get.mockReturnValue('');
    repositoryMock.find.mockResolvedValue([
      {
        allowSelfRegistration: false,
        domain: 'instituto.edu',
        allowedEmailDomains: [],
        status: InstitutionStatus.ACTIVE,
      },
    ]);

    try {
      await service.ensureTeacherInstitutionalEmail('docente@otro.edu');
      fail('Debe lanzar ValidationException para dominios no habilitados');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      expect(error).toHaveProperty('message', 'Credenciales institucionales inválidas');

      const response = (error as ValidationException).getResponse() as any;
      expect(response).toMatchObject({
        details: {
          validationErrors: {
            email: ["El dominio 'otro.edu' no está habilitado para el registro de docentes."],
          },
        },
      });
    }
  });
});
