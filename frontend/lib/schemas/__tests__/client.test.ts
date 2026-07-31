import { describe, it, expect } from 'vitest';
import { clientFormSchema } from '../client';

describe('clientFormSchema', () => {
  it('passes valid client data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      role: 'Manager',
      birthday: '1990-01-01',
      gender: 'male',
      custom_fields: { key: 'value' },
    };

    const result = clientFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
    }
  });

  it('fails when name is missing', () => {
    const invalidData = {
      name: '',
      email: 'john@example.com',
    };

    const result = clientFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required');
    }
  });

  it('fails when email format is invalid', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'not-an-email',
    };

    const result = clientFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address');
    }
  });

  it('transforms empty strings into null for optional properties', () => {
    const dataWithEmptyStrings = {
      name: 'John Doe',
      phone: '',
      email: '',
      role: '',
    };

    const result = clientFormSchema.safeParse(dataWithEmptyStrings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
      expect(result.data.email).toBe(''); // email permits literal empty string or valid email
      expect(result.data.role).toBeNull();
    }
  });
});
