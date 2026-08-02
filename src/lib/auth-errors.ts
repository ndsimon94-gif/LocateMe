export function mapSignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "That password's not right. Try again.";
  }
  return message;
}

export function mapSignUpError(message: string): string {
  if (/already registered|already exists|already been registered/i.test(message)) {
    return "That email's already on Orbit. Sign in instead?";
  }
  return message;
}

export function mapProfileSaveError(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    return "Someone's already using that name. Try another.";
  }
  return error.message;
}
