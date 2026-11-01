import { z } from 'zod';

/**
 * Zod validation schema for the login form.
 * Enforces sanitization and strict requirements aligned with FastAPI Pydantic v2 schemas.
 */
export const loginSchema = z.object({
  usernameOrPhone: z
    .string()
    .min(3, { message: 'اسم المستخدم أو رقم الهاتف يجب ألا يقل عن 3 أحرف' })
    .max(50, { message: 'اسم المستخدم أو رقم الهاتف لا يزيد عن 50 حرفاً' })
    .transform((val) => val.trim()),
  password: z
    .string()
    .min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
    .max(100, { message: 'كلمة المرور طويلة جداً' }),
  rememberMe: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;
