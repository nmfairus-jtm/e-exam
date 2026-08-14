import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createExamFn, listExamsFn } from "#/lib/exams";

export const Route = createFileRoute("/app/exams")({ component: ExamsPage });

function ExamsPage() {
	const { data: exams, isLoading } = useQuery({
		queryKey: ["exams"],
		queryFn: () => listExamsFn(),
	});
	const [title, setTitle] = useState("");
	const [creating, setCreating] = useState(false);
	const queryClient = useQueryClient();
	const createMutation = useMutation({
		mutationFn: createExamFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["exams"] });
			setTitle("");
			setCreating(false);
		},
	});

	return (
		<div className="rise-in">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="display-title text-3xl font-bold">Exams</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Assemble exams from the question bank, distribute, grade, release.
					</p>
				</div>
				{!creating && (
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
					>
						New exam
					</button>
				)}
			</div>

			{creating && (
				<div className="island-shell mt-6 max-w-md rounded-2xl p-6">
					<label className="block text-sm font-medium">
						Title
						<input
							className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</label>
					<div className="mt-4 flex gap-3">
						<button
							type="button"
							disabled={title.trim() === ""}
							onClick={() => createMutation.mutate({ data: { title } })}
							className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
						>
							Create
						</button>
						<button
							type="button"
							onClick={() => setCreating(false)}
							className="rounded-lg border border-input px-4 py-2 text-sm font-medium"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{isLoading && (
				<p className="mt-6 text-sm text-muted-foreground">Loading…</p>
			)}
			<div className="mt-6 space-y-3">
				{Array.isArray(exams) &&
					exams.map((exam) => (
						<div
							key={exam.id}
							className="feature-card rounded-xl border border-line p-4"
						>
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="font-medium">{exam.title}</p>
									<p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{exam.state}
										{exam.passMark != null ? ` · pass ${exam.passMark}` : ""}
										{exam.resultsReleasedAt ? " · results released" : ""}
									</p>
								</div>
								<Link
									to="/app/exam-builder/$examId"
									params={{ examId: exam.id }}
									className="rounded-lg border border-input px-4 py-2 text-sm font-medium no-underline"
								>
									Manage
								</Link>
							</div>
						</div>
					))}
			</div>
		</div>
	);
}
