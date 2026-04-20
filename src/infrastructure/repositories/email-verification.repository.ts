import { MoreThan, Repository } from 'typeorm';
import { EmailVerification } from '../../domain/entities/email-verification.entity';
import { IEmailVerificationRepository } from '../../domain/repository/email-verification.repository.interface';
import { EmailVerificationEntity } from '../database/typeorm/entities/email-verification.typeorm-entity';
import { UserEntity } from '../database/typeorm/entities/user.typeorm-entity';

export class EmailVerificationRepository
  implements IEmailVerificationRepository
{
  constructor(
    private readonly repository: Repository<EmailVerificationEntity>,
  ) {}

  async findLastByUserId(userId: string): Promise<EmailVerification | null> {
    const entity = await this.repository.findOne({
      where: {
        user: { id: userId },
        verified: false,
      },
      order: { created_at: 'DESC' }, // ← el más reciente sin importar expiración
      relations: ['user'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async save(emailVerification: EmailVerification): Promise<EmailVerification> {
    const entity = this.toTypeORM(emailVerification);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findActiveByUserId(userId: string): Promise<EmailVerification | null> {
    const entity = await this.repository.findOne({
      where: {
        user: { id: userId },
        verified: false,
        expired_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async invalidateUserToken(userId: string): Promise<void> {
    await this.repository.update(
      {
        user: { id: userId },
        verified: false,
      },
      { expired_at: new Date() },
    );
  }

  async findActiveByToken(token: string): Promise<EmailVerification | null> {
    const entity = await this.repository.findOne({
      where: {
        verification_token: token,
        verified: false,
        expired_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async markAsVerified(id: string): Promise<void> {
    await this.repository.update({ id }, { verified: true });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.repository.increment({ id }, 'attempts', 1);
  }

  private toDomain(entity: EmailVerificationEntity): EmailVerification {
    return new EmailVerification(
      entity.id,
      entity.verification_token,
      entity.expired_at,
      entity.verified,
      entity.attempts,
      entity.created_at,
      entity.user.id,
    );
  }
  private toTypeORM(
    emailVerification: EmailVerification,
  ): EmailVerificationEntity {
    const entity = new EmailVerificationEntity();
    entity.id = emailVerification.id;
    entity.verification_token = emailVerification.verification_token;
    entity.expired_at = emailVerification.expired_at;
    entity.verified = emailVerification.verified;
    entity.attempts = emailVerification.attempts;
    entity.created_at = emailVerification.created_at;
    const userEntity = new UserEntity();
    userEntity.id = emailVerification.user_id;
    entity.user = userEntity;
    return entity;
  }
}
