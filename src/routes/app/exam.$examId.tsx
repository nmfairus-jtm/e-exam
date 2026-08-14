import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { getMyResultFn } from "#/lib/to-exam";

export const Route = createFileRoute("/app/exam/$examId")({
	component: ResultPage,
});

function ResultPage() {
	const { examId } = useParams({ from: "/app/exam/$examId" });
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["my-result", examId],
		queryFn: () => getMyResultFn({ data: { examId } }),
		retry: false,
	});

	if (isLoading) {
		return <p>Loading…</p>;
	}
	if (isError || !data) {
		return (
			<div className="rise-in">
				<h1 className="display-title text-2xl font-bold">Result</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{error instanceof Error
						? error.message
						: "Results not available yet."}
				</p>
				<Link to="/app" className="mt-3 inline-block font-medium">
					Back to my exams
				</Link>
			</div>
		);
	}

	return (
		<div className="rise-in">
			<h1 className="display-title text-3xl font-bold">Result</h1>
			<div className="island-shell mt-6 rounded-2xl p-6">
				<p className="island-kicker">Score</p>
				<p className="display-title mt-1 text-4xl font-bold">
					{data.score}{" "}
					<span className="text-lg text-muted-foreground">/ {data.max}</span>
				</p>
				{data.pass != null && (
					<p className="mt-1 text-sm font-semibold">
						{data.pass ? "Passed" : "Failed"}
						{data.passMark != null && (
							<span className="text-muted-foreground">
								{" "}
								(pass mark {data.passMark})
							</span>
						)}
					</p>
				)}
			</div>

			<h2 className="mt-8 text-lg font-bold">Breakdown</h2>
			<div className="mt-3 space-y-3">
				{data.breakdown.map((q, i) => (
					<div
						key={q.examQuestionId}
						className="feature-card rounded-xl border border-line p-4"
					>
						<div className="flex items-start justify-between gap-4">
							<p className="text-sm font-medium">
								<span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Q{i + 1} · {q.type} · {q.pointValue} pts
								</span>
								{q.prompt}
							</p>
							<span className="whitespace-nowrap text-sm font-semibold">
								{q.earned} / {q.pointValue}
							</span>
						</div>
						{q.type === "objective" && (
							<p
								className={
									q.correct
										? "mt-1 text-xs font-semibold text-palm"
										: "mt-1 text-xs font-semibold text-destructive"
								}
							>
								{q.correct ? "Correct" : "Incorrect"}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
