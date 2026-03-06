import { ForgotPasswordPanel } from "@/components/ForgotPasswordPanel";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
	const user = await getSessionUser();
	if (user) {
		redirect("/");
	}

	return (
		<main className='flex min-h-screen items-center justify-center bg-background px-6 py-8 text-foreground'>
			<ForgotPasswordPanel />
		</main>
	);
}
