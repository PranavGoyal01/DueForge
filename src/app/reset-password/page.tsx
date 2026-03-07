import { ResetPasswordPanel } from "@/components/ResetPasswordPanel";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ResetPasswordPage() {
	const user = await getSessionUser();
	if (user) {
		redirect("/today");
	}

	return (
		<main className='flex min-h-screen items-center justify-center bg-background px-6 py-8 text-foreground'>
			<ResetPasswordPanel />
		</main>
	);
}
