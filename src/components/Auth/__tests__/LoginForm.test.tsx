/// <reference types="../../../types/jest" />
import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

const mockUseAuth = jest.fn();

jest.mock('../../../contexts/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('LoginForm', () => {
  const loginMock = jest.fn();
  const mockOnSwitchToRegister = jest.fn();

  const renderLoginForm = async () => {
    const utils = render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    await screen.findByRole('heading', { name: /iniciar sesión/i });
    return utils;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loginMock.mockReset();
    mockUseAuth.mockReturnValue({
      login: loginMock,
      isLoading: false,
    });
    loginMock.mockResolvedValue({ success: true });
  });

  it('renders login form correctly', async () => {
    await renderLoginForm();

    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    await renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    expect(await screen.findByText(/por favor completa todos los campos/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email format', async () => {
    await renderLoginForm();

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.type(emailInput, 'invalid-email');
    const passwordInput = screen.getByLabelText(/contraseña/i);
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    expect(await screen.findByText(/por favor ingresa un email válido/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    await renderLoginForm();

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message when login fails', async () => {
    loginMock.mockResolvedValue({ success: false, error: 'Credenciales inválidas' });

    await renderLoginForm();

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await act(async () => {
      fireEvent.submit(form!);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });

  it('calls onSwitchToRegister when register link is clicked', async () => {
    await renderLoginForm();

    const user = userEvent.setup();
    const registerLink = screen.getByText(/regístrate aquí/i);
    await act(async () => {
      await user.click(registerLink);
    });

    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it('disables submit button and shows loading text when context reports loading', async () => {
    mockUseAuth.mockReturnValue({
      login: loginMock,
      isLoading: true,
    });

    await renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /iniciando sesión/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument();
  });
});
