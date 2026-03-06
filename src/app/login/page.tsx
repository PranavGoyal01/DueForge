import { AuthPanel } from "@/components/AuthPanel";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
	const user = await getSessionUser();
	if (user) {
		redirect("/");
	}

	return (
		<main className='flex min-h-screen items-center justify-center bg-background px-6 py-8 text-foreground'>
			<AuthPanel />
		</main>
	);
}
