export type TemporaryTokenPayload = {
  userId: string;
  email: string;
  type: 'email_verification' | 'password_reset';
};
