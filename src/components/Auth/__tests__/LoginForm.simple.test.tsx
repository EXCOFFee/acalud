import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

const mockUseAuth = jest.fn();

jest.mock('../../../contexts/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockOnSwitchToRegister = jest.fn();

describe('LoginForm (estructura básica)', () => {
  const renderLoginForm = async () => {
    const utils = render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    await screen.findByRole('button', { name: /iniciar sesión/i });
    return utils;
  };

  beforeEach(() => {
    mockOnSwitchToRegister.mockClear();
    mockUseAuth.mockReturnValue({ login: jest.fn(), isLoading: false });
  });

  it('renders login form correctly', async () => {
    await renderLoginForm();

    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('shows demo buttons', async () => {
    await renderLoginForm();

    expect(screen.getByText(/demo docente/i)).toBeInTheDocument();
    expect(screen.getByText(/demo estudiante/i)).toBeInTheDocument();
  });

  it('allows input in form fields', async () => {
    await renderLoginForm();

    const emailInput = screen.getByLabelText(/correo electrónico/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;

    const user = userEvent.setup();
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('has proper form structure', async () => {
    await renderLoginForm();

    const emailInput = screen.getByLabelText(/correo electrónico/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;

    expect(emailInput.type).toBe('email');
    expect(passwordInput.type).toBe('password');
    expect(emailInput.required).toBe(true);
    expect(passwordInput.required).toBe(true);
  });
});
