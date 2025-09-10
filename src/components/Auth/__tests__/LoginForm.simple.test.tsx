import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock del contexto de autenticación
const mockOnSwitchToRegister = jest.fn();

describe('LoginForm', () => {
  const renderLoginForm = () => {
    return render(
      <AuthProvider>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </AuthProvider>
    );
  };

  beforeEach(() => {
    mockOnSwitchToRegister.mockClear();
  });

  it('renders login form correctly', () => {
    renderLoginForm();
    
    // Verificar que los elementos existen
    const heading = screen.getByRole('heading', { name: /iniciar sesión/i });
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    expect(heading).toBeTruthy();
    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(submitButton).toBeTruthy();
  });

  it('shows demo buttons', () => {
    renderLoginForm();
    
    const demoTeacher = screen.getByText(/demo docente/i);
    const demoStudent = screen.getByText(/demo estudiante/i);
    
    expect(demoTeacher).toBeTruthy();
    expect(demoStudent).toBeTruthy();
  });

  it('allows input in form fields', () => {
    renderLoginForm();
    
    const emailInput = screen.getByLabelText(/correo electrónico/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('has proper form structure', () => {
    renderLoginForm();
    
    const emailInput = screen.getByLabelText(/correo electrónico/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;
    
    expect(emailInput.type).toBe('email');
    expect(passwordInput.type).toBe('password');
    expect(emailInput.required).toBe(true);
    expect(passwordInput.required).toBe(true);
  });
});
