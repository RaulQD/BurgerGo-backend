import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validador custom que verifica que dos campos coincidan
 * Útil para confirmar contraseñas, emails, etc.
 */

@ValidatorConstraint({ name: 'Match' })
export class Matchconstraint implements ValidatorConstraintInterface {
  validate(
    value: any,
    validationArguments: ValidationArguments,
  ): Promise<boolean> | boolean {
    const [relatedPropertyName] = validationArguments.constraints;
    const relatedValue = (validationArguments.object as any)[
      relatedPropertyName
    ];
    return value === relatedValue;
  }
  defaultMessage?(validationArguments: ValidationArguments): string {
    const [relatedPropertyName] = validationArguments.constraints;
    return `${validationArguments.property} debe coincidir con ${relatedPropertyName}`;
  }
}
/**
 * Decorador @Match() para usar en DTOs
 * @param property - Nombre del campo con el que debe coincidir
 * @param validationOptions - Opciones de validación (mensaje personalizado, etc.)
 *
 * @example
 * class ResetPasswordDTO {
 *   newPassword: string;
 *
 *   @Match('newPassword', { message: 'Las contraseñas no coinciden' })
 *   confirmedPassword: string;
 * }
 */
export function Match(property: string, validationOptions: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: Matchconstraint,
    });
  };
}
