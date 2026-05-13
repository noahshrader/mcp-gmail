import { z } from 'zod';

export const idSchema = z.string().trim().min(1).max(255);
export const bodySchema = z.string().min(1);
export const subjectSchema = z.string().min(1).max(998);
export const optionalSubjectSchema = subjectSchema.optional();
export const emailAddressSchema = z.string().email();
export const addressListSchema = z.array(emailAddressSchema).min(1).max(100);
export const optionalAddressListSchema = addressListSchema.optional();
export const dryRunSchema = z.boolean().default(true);
export const includeBodySchema = z.boolean().default(true);
export const querySchema = z.string().trim().min(1).max(500);
export const maxResultsSchema = z.number().int().positive().max(100).default(20);
export const pageTokenSchema = z.string().trim().min(1).max(500).optional();
export const labelIdsSchema = z.array(idSchema).min(1).max(100);