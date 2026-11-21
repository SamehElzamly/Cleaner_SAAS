import { registerDecorator, ValidationOptions } from 'class-validator';

// Accepts any IANA timezone name the runtime knows ("Africa/Cairo", "UTC", ...).
export function IsIanaTimezone(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid IANA timezone, e.g. "Africa/Cairo"`,
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !value) return false;
          try {
            new Intl.DateTimeFormat('en-US', { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
      },
    });
  };
}
