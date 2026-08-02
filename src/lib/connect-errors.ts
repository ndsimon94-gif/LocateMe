export function mapRedeemError(message: string): string {
  if (message.includes('own_code')) {
    return "That's your own code — have your friend scan it instead.";
  }
  if (message.includes('code_expired') || message.includes('code_not_found')) {
    return "That code's expired. Ask them for a new one.";
  }
  if (message.includes('not_authenticated')) {
    return 'Sign in and try again.';
  }
  return message;
}
