import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

type MockedLocation = { search: string };
type MockedAuthContext = { user: { email: string } | null; isAuthenticated: boolean };

const mockUseLocation = jest.fn<MockedLocation, []>();
const mockUseAuth = jest.fn<MockedAuthContext, []>();
const goToHomeMock = jest.fn();
const goToLoginMock = jest.fn();
const goToRegisterMock = jest.fn();
const goToMyClassroomsMock = jest.fn();
const validateTokenMock = jest.fn();
const consumeInvitationMock = jest.fn();

const invitationServiceMock = {
  validateToken: validateTokenMock,
  consumeInvitation: consumeInvitationMock,
};

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
  };
});

jest.mock('../../../contexts/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({
    goToHome: goToHomeMock,
    goToLogin: goToLoginMock,
    goToRegister: goToRegisterMock,
    goToMyClassrooms: goToMyClassroomsMock,
  }),
}));

jest.mock('../../../services/implementations/ClassroomInvitationService', () => ({
  ClassroomInvitationService: {
    getInstance: () => invitationServiceMock,
  },
}));

import { AcceptInvitationPage } from '../AcceptInvitationPage';

const renderInvitationPage = () => render(<AcceptInvitationPage />);

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocation.mockReturnValue({ search: '' });
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
    validateTokenMock.mockResolvedValue({ valid: true });
    consumeInvitationMock.mockResolvedValue(undefined);
  });

  it('shows invalid state when validation fails', async () => {
    mockUseLocation.mockReturnValue({ search: '?token=expired-token' });
    validateTokenMock.mockResolvedValue({
      valid: false,
      reason: 'expired',
      status: 'expired',
      token: 'expired-token',
    });

  renderInvitationPage();

    await waitFor(() => {
      expect(validateTokenMock).toHaveBeenCalledWith('expired-token');
    });

    await screen.findByRole('heading', { name: 'Invitación no disponible' });
    expect(
      await screen.findByText('La invitación expiró. Solicita al docente que envíe una nueva.'),
    ).toBeInTheDocument();
  });

  it('allows accepting an invitation when emails match', async () => {
    mockUseLocation.mockReturnValue({ search: '?token=valid-token' });
    mockUseAuth.mockReturnValue({
      user: { email: 'student@example.com' },
      isAuthenticated: true,
    });
    validateTokenMock.mockResolvedValue({
      valid: true,
      status: 'pending',
      token: 'valid-token',
      email: 'student@example.com',
      classroom: {
        id: 'class-1',
        name: 'Matemáticas Avanzadas',
        subject: 'Matemáticas',
        grade: '5°',
      },
    });
    consumeInvitationMock.mockResolvedValue({
      status: 'accepted',
      classroomId: 'class-1',
      studentId: 'student-1',
      email: 'student@example.com',
    });

    renderInvitationPage();

    await waitFor(() => {
      expect(validateTokenMock).toHaveBeenCalledWith('valid-token');
    });

    const acceptButton = await screen.findByRole('button', { name: /Aceptar invitación/i });
    expect(acceptButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(acceptButton);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '¡Invitación aceptada!' })).toBeInTheDocument();
    });

    expect(consumeInvitationMock).toHaveBeenCalledWith('valid-token', 'student@example.com');
  });

  it('warns when session email differs from invitation', async () => {
    mockUseLocation.mockReturnValue({ search: '?token=warning-token' });
    mockUseAuth.mockReturnValue({
      user: { email: 'other@example.com' },
      isAuthenticated: true,
    });
    validateTokenMock.mockResolvedValue({
      valid: true,
      status: 'pending',
      token: 'warning-token',
      email: 'student@example.com',
    });

    renderInvitationPage();

    await waitFor(() => {
      expect(validateTokenMock).toHaveBeenCalledWith('warning-token');
    });

    expect(
      await screen.findByText('Tu sesión actual no coincide con la invitación'),
    ).toBeInTheDocument();

    const acceptButton = await screen.findByRole('button', { name: /Aceptar invitación/i });
    expect(acceptButton).toBeDisabled();
  });
});
