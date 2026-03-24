function parseArgs(argv) {
	const args = {
		baseUrl: process.env.APP_BASE_URL ?? "",
		cronSecret: process.env.CRON_SECRET ?? "",
		live: false,
		driftQuery: "dryRun=1&lookbackHours=12&horizonHours=24&duplicateWindowHours=12&limit=200",
		nudgeQuery: "dryRun=1&limit=200",
	};

	for (let i = 2; i < argv.length; i += 1) {
		const token = argv[i];
		if (token === "--live") {
			args.live = true;
			args.driftQuery = "lookbackHours=12&horizonHours=24&duplicateWindowHours=12&limit=200";
			args.nudgeQuery = "limit=200";
			continue;
		}

		if (token.startsWith("--base-url=")) {
			args.baseUrl = token.slice("--base-url=".length);
			continue;
		}

		if (token.startsWith("--cron-secret=")) {
			args.cronSecret = token.slice("--cron-secret=".length);
			continue;
		}
	}

	return args;
}

function normalizeBaseUrl(value) {
	return value.replace(/\/$/, "");
}

function printSummary(label, body) {
	console.log(`\n${label}`);
	console.log(`  runId: ${String(body?.runId ?? "n/a")}`);
	console.log(`  mode: ${String(body?.mode ?? "n/a")}`);
	console.log(`  dryRun: ${String(body?.dryRun ?? "n/a")}`);
	console.log(`  durationMs: ${String(body?.durationMs ?? "n/a")}`);
	if (typeof body?.queued === "number") {
		console.log(`  queued: ${body.queued}`);
	}
	if (typeof body?.pending === "number") {
		console.log(`  pending: ${body.pending}`);
	}
	if (typeof body?.sent === "number" || typeof body?.failed === "number") {
		console.log(`  sent: ${String(body?.sent ?? "n/a")}`);
		console.log(`  failed: ${String(body?.failed ?? "n/a")}`);
	}
}

async function invokeJob(baseUrl, cronSecret, pathWithQuery) {
	const response = await fetch(`${baseUrl}${pathWithQuery}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${cronSecret}`,
		},
	});

	const body = await response.json().catch(() => ({}));
	return { ok: response.ok, status: response.status, body };
}

async function run() {
	const args = parseArgs(process.argv);
	const baseUrl = normalizeBaseUrl(args.baseUrl);
	const cronSecret = args.cronSecret;

	if (!baseUrl) {
		console.error("Missing base URL. Provide APP_BASE_URL or --base-url=<url>.");
		process.exit(1);
	}

	if (!cronSecret) {
		console.error("Missing CRON_SECRET. Provide env var or --cron-secret=<secret>.");
		process.exit(1);
	}

	if (args.live) {
		console.warn("Running in LIVE mode. Reminders may be created and/or dispatched.");
	} else {
		console.log("Running in DRY-RUN mode.");
	}

	const drift = await invokeJob(baseUrl, cronSecret, `/api/jobs/drift-scan?${args.driftQuery}`);
	if (!drift.ok) {
		console.error(`drift-scan failed with status ${drift.status}`);
		console.error(JSON.stringify(drift.body, null, 2));
		process.exit(1);
	}

	const nudges = await invokeJob(baseUrl, cronSecret, `/api/jobs/nudges/dispatch?${args.nudgeQuery}`);
	if (!nudges.ok) {
		console.error(`nudges/dispatch failed with status ${nudges.status}`);
		console.error(JSON.stringify(nudges.body, null, 2));
		process.exit(1);
	}

	printSummary("drift-scan", drift.body);
	printSummary("nudges/dispatch", nudges.body);

	console.log("\nPilot cron check completed successfully.");
}

await run();
