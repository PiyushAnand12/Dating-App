import { z } from 'zod';

// ─── Shared field definitions ────────────────────────────────────────────────

const genderEnum = z.enum(['MAN', 'WOMAN', 'NON_BINARY', 'OTHER']);

const relationshipGoalEnum = z.enum([
  'LONG_TERM_PARTNER',
  'LONG_TERM_BUT_OPEN',
  'SHORT_TERM_BUT_OPEN',
  'SHORT_TERM_FUN',
  'NEW_FRIENDS',
  'STILL_FIGURING_OUT',
]);

const showMeEnum = z.enum(['MEN', 'WOMEN', 'NON_BINARY', 'EVERYONE']);

// ─── Update profile ──────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name must not be empty')
    .max(50, 'First name must be 50 characters or fewer')
    .optional(),

  dateOfBirth: z
    .string()
    .date('Date of birth must be a valid date (YYYY-MM-DD)')
    .refine((val) => {
      const dob   = new Date(val);
      const today = new Date();
      const age   = today.getFullYear() - dob.getFullYear();
      const hasBirthdayPassed =
        today.getMonth() > dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
      return (age > 18) || (age === 18 && hasBirthdayPassed);
    }, 'You must be at least 18 years old')
    .optional(),

  gender: genderEnum.optional(),

  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or fewer')
    .optional(),

  height: z
    .number({ invalid_type_error: 'Height must be a number' })
    .int('Height must be a whole number')
    .min(100, 'Height must be at least 100 cm')
    .max(250, 'Height must be 250 cm or less')
    .optional(),

  jobTitle: z
    .string()
    .max(100, 'Job title must be 100 characters or fewer')
    .optional(),

  company: z
    .string()
    .max(100, 'Company must be 100 characters or fewer')
    .optional(),

  livingIn: z
    .string()
    .max(100, 'Living in must be 100 characters or fewer')
    .optional(),

  relationshipGoal: relationshipGoalEnum.optional(),
}).strict();

// ─── Update location ─────────────────────────────────────────────────────────

export const updateLocationSchema = z.object({
  latitude: z
    .number({ required_error: 'Latitude is required' })
    .min(-90,  'Latitude must be between -90 and 90')
    .max(90,   'Latitude must be between -90 and 90'),

  longitude: z
    .number({ required_error: 'Longitude is required' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180,  'Longitude must be between -180 and 180'),

  city: z
    .string()
    .max(100, 'City must be 100 characters or fewer')
    .optional(),
}).strict();

// ─── Update preferences ──────────────────────────────────────────────────────

export const updatePreferencesSchema = z.object({
  showMe: showMeEnum.optional(),

  minAge: z
    .number()
    .int()
    .min(18, 'Minimum age must be at least 18')
    .optional(),

  maxAge: z
    .number()
    .int()
    .max(99, 'Maximum age must be 99 or less')
    .optional(),

  maxDistanceKm: z
    .number()
    .int()
    .min(1,    'Distance must be at least 1 km')
    .max(500,  'Distance must be 500 km or less')
    .optional(),

  relationshipGoals: z
    .array(relationshipGoalEnum)
    .optional(),

  emailNotifications: z.boolean().optional(),
  pushNotifications:  z.boolean().optional(),

  minHeight: z
    .number()
    .int()
    .min(50,   'Minimum height must be at least 50 cm')
    .max(250,  'Height exceeds maximum allowed')
    .optional(),

  maxHeight: z
    .number()
    .int()
    .min(50,   'Height below minimum allowed')
    .max(250,  'Maximum height must be 250 cm or less')
    .optional(),
  interestIds: z
    .array(z.string())
    .optional(),
  activeWithinHours: z
    .number()
    .int()
    .min(1)
    .max(168)
    .optional(),
  sortBy: z
    .enum(['DISTANCE', 'RECENTLY_ACTIVE', 'AGE_ASC', 'AGE_DESC', 'RELEVANCE'])
    .optional(),
  distanceUnit: z
    .enum(['KM', 'MILES'])
    .optional(),
  hideDistance: z
    .boolean()
    .optional(),
})
.strict()
.refine(
  (data) =>
    data.minAge === undefined ||
    data.maxAge === undefined ||
    data.minAge <= data.maxAge,
  { message: 'Minimum age must not exceed maximum age', path: ['minAge'] }
)
.refine(
  (data) =>
    data.minHeight === undefined ||
    data.maxHeight === undefined ||
    data.minHeight <= data.maxHeight,
  { message: 'Minimum height must not exceed maximum height', path: ['minHeight'] }
);

// ─── Discover toggle ─────────────────────────────────────────────────────────

export const discoverToggleSchema = z.object({
  discoverEnabled: z.boolean({
    required_error: 'discoverEnabled is required',
    invalid_type_error: 'discoverEnabled must be a boolean',
  }),
}).strict();

export const registerTokenSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    platform: z.enum(['FCM', 'APNS']),
  }),
});

export const unregisterTokenSchema = z.object({
  body: z.object({
    token: z.string().min(10),
  }),
});
