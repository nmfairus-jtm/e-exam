import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listMyExamsFn } from "#/lib/to-exam";

export const Route = createFileRoute("/app/")({ component: StudentDashboard });

function StudentDashboard() {
	const { data: exams, isLoading } = useQuery({
		queryKey: ["my-exams"],
		queryFn: () => listMyExamsFn(),
	});

	return (
		<div className="rise-in">
			<h1 className="display-title text-3xl font-bold">My exams</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Exams you've been distributed. Results appear once released.
			</p>

			{isLoading && (
				<p className="mt-6 text-sm text-muted-foreground">Loading…</p>
			)}
			{!isLoading && (exams?.length ?? 0) === 0 && (
				<p className="mt-6 text-sm text-muted-foreground">
					You haven't been distributed any exams yet.
				</p>
			)}

			<div className="mt-6 grid gap-4 sm:grid-cols-2">
				{exams?.map((exam) => (
					<div
						key={exam.id}
						className="feature-card rounded-2xl border border-line p-6"
					>
						<div className="flex items-center justify-between">
							<h2 className="display-title text-lg font-bold">{exam.title}</h2>
							<span className="rounded-full border border-line bg-chip-bg px-3 py-1 text-xs font-semibold uppercase tracking-wide">
								{exam.state}
							</span>
						</div>
						<div className="mt-4 flex gap-3">
							{exam.state === "live" && (
								<Link
									to="/app/exam-read/$examId"
									params={{ examId: exam.id }}
									className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background no-underline"
								>
									Take exam
								</Link>
							)}
							<Link
								to="/app/exam/$examId"
								params={{ examId: exam.id }}
								className="rounded-lg border border-input px-4 py-2 text-sm font-medium"
							>
								Result
							</Link>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
