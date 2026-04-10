import { loadLocalEnv } from "./load-env.mjs";

const checks = [];

loadLocalEnv();

function addCheck(name, pass, details) {
	checks.push({ name, pass, details });
}

function env(name) {
	return process.env[name] ?? "";
}

async function run() {
	const authSecret = env("AUTH_SECRET");
	const cronSecret = env("CRON_SECRET");
	const databaseUrl = env("DATABASE_URL");
	const directUrl = env("DIRECT_URL");
	const appBaseUrl = env("APP_BASE_URL");

	addCheck("AUTH_SECRET length >= 24", authSecret.length >= 24, `Length: ${authSecret.length}`);
	addCheck("CRON_SECRET length >= 16", cronSecret.length >= 16, `Length: ${cronSecret.length}`);
	addCheck("DATABASE_URL includes :6543", databaseUrl.includes(":6543"), databaseUrl ? "Detected value shape" : "Missing DATABASE_URL");
	addCheck("DIRECT_URL includes :5432", directUrl.includes(":5432"), directUrl ? "Detected value shape" : "Missing DIRECT_URL");
	addCheck("APP_BASE_URL set", Boolean(appBaseUrl), appBaseUrl || "Missing APP_BASE_URL");

	if (appBaseUrl) {
		const healthUrl = `${appBaseUrl.replace(/\/$/, "")}/api/health`;
		try {
			const healthResponse = await fetch(healthUrl);
			const healthBody = await healthResponse.json().catch(() => ({}));
			const healthPass = healthResponse.ok && healthBody && healthBody.ok === true;
			addCheck("/api/health responds ok:true", healthPass, `Status: ${healthResponse.status}`);
		} catch (error) {
			addCheck("/api/health responds ok:true", false, `Request failed: ${error instanceof Error ? error.message : "unknown"}`);
		}

		const todayUrl = `${appBaseUrl.replace(/\/$/, "")}/today`;
		try {
			const todayResponse = await fetch(todayUrl, { redirect: "manual" });
			const location = todayResponse.headers.get("location") ?? "";
			const redirectedToLogin = (todayResponse.status === 302 || todayResponse.status === 307) && location.includes("/login");
			addCheck("/today redirects to /login when unauthenticated", redirectedToLogin, `Status: ${todayResponse.status}, Location: ${location || "(none)"}`);
		} catch (error) {
			addCheck("/today redirects to /login when unauthenticated", false, `Request failed: ${error instanceof Error ? error.message : "unknown"}`);
		}

		const driftScanUrl = `${appBaseUrl.replace(/\/$/, "")}/api/jobs/drift-scan`;
		try {
			const driftResponse = await fetch(driftScanUrl, { method: "GET", redirect: "manual" });
			addCheck("/api/jobs/drift-scan rejects unauthenticated", driftResponse.status === 401, `Status: ${driftResponse.status}`);
		} catch (error) {
			addCheck("/api/jobs/drift-scan rejects unauthenticated", false, `Request failed: ${error instanceof Error ? error.message : "unknown"}`);
		}
	}

	let failed = 0;
	for (const item of checks) {
		if (item.pass) {
			console.log(`PASS  ${item.name} (${item.details})`);
		} else {
			failed += 1;
			console.error(`FAIL  ${item.name} (${item.details})`);
		}
	}

	if (failed > 0) {
		console.error(`\nDeployment checks failed: ${failed}/${checks.length}`);
		process.exit(1);
	}

	console.log(`\nDeployment checks passed: ${checks.length}/${checks.length}`);
}

await run();
