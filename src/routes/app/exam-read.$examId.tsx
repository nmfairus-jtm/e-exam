import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { AnswerValue } from "#/db/schema";
import { getTakingStateFn, saveAnswersFn, submitFn } from "#/lib/to-exam";

export const Route = createFileRoute("/app/exam-read/$examId")({
	component: TakeExamPage,
});

function TakeExamPage() {
	const { examId } = useParams({ from: "/app/exam-read/$examId" });
	const { data, isLoading, refetch } = useQuery({
		queryKey: ["taking-state", examId],
		queryFn: () => getTakingStateFn({ data: { examId } }),
		retry: false,
	});
	const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const locked =
		data?.submission?.status === "submitted" || data?.exam.state === "closed";

	// seed from loaded state once
	const seeded = useMemo(() => answers, [answers]);

	if (isLoading) {
		return <p>Loading…</p>;
	}
	if (!data) {
		return (
			<div className="rise-in">
				<p>This exam isn't available to you.</p>
				<Link to="/app" className="mt-2 inline-block font-medium">
					Back to my exams
				</Link>
			</div>
		);
	}

	const initialAnswers: Record<string, AnswerValue> = data.answers ?? {};
	const currentAnswers =
		Object.keys(answers).length > 0 ? answers : initialAnswers;

	function setAnswer(questionId: string, value: AnswerValue) {
		if (locked) return;
		setMessage(null);
		setAnswers((prev) => {
			const next = Object.keys(prev).length > 0 ? prev : { ...initialAnswers };
			return { ...next, [questionId]: value };
		});
	}

	async function save() {
		setSaving(true);
		setMessage(null);
		try {
			await saveAnswersFn({
				data: {
					examId,
					answers:
						Object.keys(currentAnswers).length > 0
							? currentAnswers
							: initialAnswers,
				},
			});
			setMessage("Draft saved.");
		} catch {
			setMessage("Could not save draft.");
		} finally {
			setSaving(false);
		}
	}

	async function submit() {
		if (!window.confirm("Submit your exam? This cannot be undone.")) return;
		setSaving(true);
		try {
			await submitFn({ data: { examId } });
			await refetch();
			setMessage("Submitted.");
		} catch {
			setMessage("Could not submit.");
		} finally {
			setSaving(false);
		}
	}

	void seeded;
	void locked;

	return (
		<div className="rise-in">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="display-title text-3xl font-bold">
						{data.exam.title}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{data.exam.state} ·{" "}
						{data.submission?.status === "submitted" ? "submitted" : "draft"}
					</p>
				</div>
				{!locked && (
					<div className="flex gap-3">
						<button
							type="button"
							onClick={save}
							disabled={saving}
							className="rounded-lg border border-input px-4 py-2 text-sm font-medium"
						>
							{saving ? "Saving…" : "Save draft"}
						</button>
						<button
							type="button"
							onClick={submit}
							disabled={saving}
							className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
						>
							Submit
						</button>
					</div>
				)}
			</div>
			{message && (
				<p className="mt-3 inline-block rounded-lg border border-line bg-chip-bg px-3 py-1.5 text-sm">
					{message}
				</p>
			)}

			<div className="mt-8 space-y-8">
				{data.sections.map((section) => (
					<section key={section.id} className="island-shell rounded-2xl p-6">
						<h2 className="display-title text-xl font-bold">
							{section.title}
							<span className="ml-2 text-sm font-semibold text-muted-foreground">
								{section.questions.reduce((s, q) => s + q.pointValue, 0)} pts
							</span>
						</h2>
						<div className="mt-4 space-y-6">
							{section.questions.map((q) => (
								<div
									key={q.id}
									className="border-t pt-4 first:border-t-0 first:pt-0"
								>
									<p className="font-medium">
										<span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
											{q.snapshotType} · {q.pointValue} pts
										</span>
										{q.snapshotPrompt}
									</p>
									{q.snapshotOptions?.length ? (
										<div className="mt-3 flex flex-wrap gap-2">
											{q.snapshotOptions.map((opt) => (
												<button
													key={opt.label}
													type="button"
													disabled={locked}
													onClick={() => setAnswer(q.id, { label: opt.label })}
													className={
														currentAnswers[q.id] === opt.label ||
														(currentAnswers[q.id] as { label?: string })
															?.label === opt.label
															? "rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background"
															: "rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium"
													}
												>
													{opt.label}
												</button>
											))}
										</div>
									) : q.snapshotExactAnswer !== null &&
										q.snapshotExactAnswer !== undefined ? (
										<input
											type="text"
											disabled={locked}
											value={
												typeof currentAnswers[q.id] === "string"
													? String(currentAnswers[q.id])
													: ""
											}
											onChange={(e) => setAnswer(q.id, e.target.value)}
											className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
											placeholder="Your answer"
										/>
									) : (
										<textarea
											disabled={locked}
											value={
												typeof currentAnswers[q.id] === "string"
													? String(currentAnswers[q.id])
													: ""
											}
											onChange={(e) => setAnswer(q.id, e.target.value)}
											className="mt-3 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
											placeholder="Your answer"
										/>
									)}
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
