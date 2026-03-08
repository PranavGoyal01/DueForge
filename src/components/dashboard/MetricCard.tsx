import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
	label: string;
	value: string | number;
	valueClassName?: string;
	size?: "sm" | "default";
};

export function MetricCard({ label, value, valueClassName, size = "sm" }: MetricCardProps) {
	return (
		<Card size={size}>
			<CardHeader className='pb-0'>
				<CardDescription className='text-[11px] uppercase tracking-wide'>{label}</CardDescription>
				<CardTitle className={valueClassName}>{value}</CardTitle>
			</CardHeader>
		</Card>
	);
}
