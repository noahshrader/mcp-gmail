import { z } from 'zod';

const printableIdPattern = /^[a-zA-Z0-9_-]+$/;
const printableSystemLabelPattern = /^[A-Z_]+$/;

export const idSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(printableIdPattern, 'ID must contain only letters, numbers, underscores, and hyphens');
export const bodySchema = z.string().min(1);
export const subjectSchema = z.string().min(1).max(998);
export const optionalSubjectSchema = subjectSchema.optional();
export const emailAddressSchema = z.string().trim().email();
export const addressListSchema = z.array(emailAddressSchema).min(1).max(100);
export const optionalAddressListSchema = addressListSchema.optional();
export const dryRunSchema = z.boolean().default(true);
export const includeBodySchema = z.boolean().default(true);
export const querySchema = z
	.string()
	.max(500)
	.transform((value) => value.replace(/\0/g, '').trim())
	.refine((value) => value.length > 0, 'Search query cannot be empty');
export const maxResultsSchema = z.number().int().positive().max(100).default(20);
export const pageTokenSchema = z.string().trim().min(1).max(500).optional();
export const labelIdSchema = z
	.string()
	.trim()
	.min(1)
	.max(255)
	.refine(
		(value) => printableIdPattern.test(value) || printableSystemLabelPattern.test(value),
		'Label ID must be a valid Gmail label identifier'
	);
export const labelIdsSchema = z.array(labelIdSchema).min(1).max(100);