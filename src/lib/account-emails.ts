import { getAppBaseUrl, sendTransactionalEmail } from "@/lib/mailer";

function esc(value: string) {
	return value.replace(/[&<>'"]/g, (char) => {
		const table: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"'": "&#39;",
			'"': "&quot;",
		};
		return table[char] ?? char;
	});
}

export async function sendEmailVerificationEmail(input: { email: string; name: string; token: string }) {
	const verifyUrl = `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(input.token)}`;
	const safeName = esc(input.name || "there");

	await sendTransactionalEmail({
		to: input.email,
		subject: "Verify your DueForge account",
		text: `Hi ${input.name},\n\nVerify your DueForge account:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
		html: `<p>Hi ${safeName},</p><p>Verify your DueForge account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
	});
}

export async function sendPasswordResetEmail(input: { email: string; name: string; token: string }) {
	const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;
	const safeName = esc(input.name || "there");

	await sendTransactionalEmail({
		to: input.email,
		subject: "Reset your DueForge password",
		text: `Hi ${input.name},\n\nReset your DueForge password:\n${resetUrl}\n\nThis link expires in 60 minutes.`,
		html: `<p>Hi ${safeName},</p><p>Reset your DueForge password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 60 minutes.</p>`,
	});
}
