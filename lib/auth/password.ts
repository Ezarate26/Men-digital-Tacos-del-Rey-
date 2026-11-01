const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function emailError(value: string) {
  if (!EMAIL.test(value)) return "Escribe un correo válido.";
  return null;
}

export function passwordError(password: string, confirmation: string) {
  if (password.length < 12) {
    return "La contraseña debe tener al menos 12 caracteres.";
  }

  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) {
    return "Incluye al menos una letra y un número.";
  }

  if (password !== confirmation) return "La confirmación no coincide.";
  return null;
}
