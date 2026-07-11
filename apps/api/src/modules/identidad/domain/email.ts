/** Normaliza un email para unicidad (trim + minúsculas) — CU-001, constraint UNIQUE(lower(email)). */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
