export class EmailVerification {
  constructor(
    public readonly id: string,
    public verification_token: string,
    public expired_at: Date,
    public verified: boolean,
    public created_at: Date,
    public user_id: string,
  ) {}
}
