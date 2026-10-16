export interface LoginForm {
  email: string;
  password: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 12) {
    problems.push("Use at least 12 characters.");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    problems.push("Mix letters and numbers.");
  }
  return problems;
}

export function validateLoginForm(form: LoginForm): ValidationResult {
  const errors: string[] = [];
  if (!isValidEmail(form.email)) {
    errors.push("Enter a valid email address.");
  }
  errors.push(...passwordProblems(form.password));
  return { valid: errors.length === 0, errors };
}
