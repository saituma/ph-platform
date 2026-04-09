export type PasswordRuleStatus = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export function getPasswordRuleStatus(password: string): PasswordRuleStatus {
  const value = password ?? "";
  return {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
}

export function isStrongPassword(password: string): boolean {
  const status = getPasswordRuleStatus(password);
  return (
    status.minLength &&
    status.uppercase &&
    status.lowercase &&
    status.number &&
    status.special
  );
}
