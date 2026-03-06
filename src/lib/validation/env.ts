import { z } from "zod";

const appEnvSchema = z.object({
	APP_BASE_URL: z.string().url(),
	AUTH_SECRET: z.string().min(24),
	DATABASE_URL: z.string().min(1),
	SMTP_FROM_EMAIL: z.string().email(),
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	GOOGLE_REDIRECT_URI: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getAppEnv(): AppEnv {
	if (cachedEnv) {
		return cachedEnv;
	}

	const parsed = appEnvSchema.safeParse(process.env);
	if (!parsed.success) {
		const flattened = parsed.error.flatten().fieldErrors;
		throw new Error(`Invalid environment configuration: ${JSON.stringify(flattened)}`);
	}

	cachedEnv = parsed.data;
	return cachedEnv;
}
