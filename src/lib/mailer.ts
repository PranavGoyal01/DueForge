import { getAppEnv } from "@/lib/validation/env";
import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = getAppEnv().SMTP_FROM_EMAIL;

function isMailerConfigured() {
	return Boolean(smtpHost && smtpUser && smtpPass);
}

function getTransport() {
	return nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure: smtpPort === 465,
		auth: {
			user: smtpUser,
			pass: smtpPass,
		},
	});
}

export async function sendTransactionalEmail(input: { to: string; subject: string; text: string; html: string }) {
	if (!isMailerConfigured()) {
		console.warn("SMTP is not configured. Skipping email delivery.", {
			to: input.to,
			subject: input.subject,
		});
		return;
	}

	const transport = getTransport();
	await transport.sendMail({
		from: fromEmail,
		to: input.to,
		subject: input.subject,
		text: input.text,
		html: input.html,
	});
}

export function getAppBaseUrl() {
	return getAppEnv().APP_BASE_URL;
}
