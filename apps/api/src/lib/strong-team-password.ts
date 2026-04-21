/** Coach-set athlete passwords: length + mixed character classes. */

export const STRONG_TEAM_PASSWORD_MIN = 10;
export const STRONG_TEAM_PASSWORD_MAX = 128;

export function isStrongTeamAthletePassword(password: string): boolean {
  if (
    password.length < STRONG_TEAM_PASSWORD_MIN ||
    password.length > STRONG_TEAM_PASSWORD_MAX
  ) {
    return false;
  }
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
