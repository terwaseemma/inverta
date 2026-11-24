import { memberCodeBase, memberCodeFrom, normalizeMemberCode } from './team';
import { acceptInviteSchema, calculatorSubmissionSchema, memberInviteSchema } from './schemas';

describe('marketer link codes', () => {
  it('builds a readable code from the first name and a suffix', () => {
    expect(memberCodeFrom('Amaka Okafor', '7k2p')).toBe('amaka-7k2p');
  });

  it('strips accents and punctuation so the code is URL-safe', () => {
    expect(memberCodeFrom("Chídì O'Brien", 'ab12')).toBe('chidi-ab12');
  });

  it('falls back to "agent" when the name has nothing usable', () => {
    expect(memberCodeBase('   ')).toBe('agent');
    expect(memberCodeBase('!!!')).toBe('agent');
  });

  it('keeps long first names short enough to paste', () => {
    expect(memberCodeBase('Oluwaseyifunmilayo').length).toBeLessThanOrEqual(16);
  });
});

describe('normalizeMemberCode', () => {
  it('accepts a well-formed code and lowercases it', () => {
    expect(normalizeMemberCode('Amaka-7K2P')).toBe('amaka-7k2p');
  });

  it('turns anything malformed into undefined, never an error', () => {
    // A mangled WhatsApp paste must degrade to an unattributed lead, not a
    // failed quote the customer can see.
    expect(normalizeMemberCode('amaka 7k2p')).toBeUndefined();
    expect(normalizeMemberCode('../admin')).toBeUndefined();
    expect(normalizeMemberCode('-amaka')).toBeUndefined();
    expect(normalizeMemberCode('a'.repeat(41))).toBeUndefined();
    expect(normalizeMemberCode('')).toBeUndefined();
    expect(normalizeMemberCode(undefined)).toBeUndefined();
    expect(normalizeMemberCode(42)).toBeUndefined();
  });
});

describe('memberInviteSchema', () => {
  it('lowercases and trims the email so one person cannot be invited twice', () => {
    const r = memberInviteSchema.parse({ name: 'Amaka', email: '  Amaka@Example.COM ' });
    expect(r.email).toBe('amaka@example.com');
  });

  it('requires a name and a real email', () => {
    expect(memberInviteSchema.safeParse({ name: 'A', email: 'a@b.co' }).success).toBe(false);
    expect(memberInviteSchema.safeParse({ name: 'Amaka', email: 'nope' }).success).toBe(false);
  });
});

describe('acceptInviteSchema', () => {
  it('uses the same password rule as signup', () => {
    expect(acceptInviteSchema.safeParse({ password: 'short', confirm: 'short' }).success).toBe(false);
    expect(
      acceptInviteSchema.safeParse({ password: 'long-enough', confirm: 'long-enough' }).success,
    ).toBe(true);
  });

  it('rejects mismatched confirmation on the confirm field', () => {
    const r = acceptInviteSchema.safeParse({ password: 'long-enough', confirm: 'long-enougj' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.path).toEqual(['confirm']);
  });
});

describe('calculatorSubmissionSchema.memberCode', () => {
  const base = {
    appliances: [{ name: 'LED bulb', wattage: 10, quantity: 1, hoursPerDay: 5 }],
    backupHours: 6,
    batteryPreference: 'lithium' as const,
    customerName: 'Ada',
    customerEmail: 'ada@example.com',
    customerPhone: '+2348000000000',
    consent: true as const,
  };

  it('is optional — the plain installer link still submits', () => {
    expect(calculatorSubmissionSchema.safeParse(base).success).toBe(true);
  });

  it('carries the code through when present', () => {
    const r = calculatorSubmissionSchema.parse({ ...base, memberCode: 'amaka-7k2p' });
    expect(r.memberCode).toBe('amaka-7k2p');
  });
});
