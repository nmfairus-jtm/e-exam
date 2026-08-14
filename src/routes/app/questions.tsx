import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { QuestionOption, QuestionRubric } from "#/db/schema";
import {
	createQuestionFn,
	deleteQuestionFn,
	listQuestionsFn,
} from "#/lib/questions";

export const Route = createFileRoute("/app/questions")({
	component: QuestionBank,
});

type QuestionType = "objective" | "subjective";

function QuestionBank() {
	const { data: questions, isLoading } = useQuery({
		queryKey: ["questions"],
		queryFn: () => listQuestionsFn(),
	});
	const [creating, setCreating] = useState(false);
	const [type, setType] = useState<QuestionType>("objective");
	const [prompt, setPrompt] = useState("");
	const [options, setOptions] = useState<QuestionOption[]>([
		{ label: "" },
		{ label: "" },
	]);
	const [exactAnswer, setExactAnswer] = useState("");
	const [criteria, setCriteria] = useState<{ label: string; max: number }[]>([
		{ label: "", max: 10 },
	]);
	const [error, setError] = useState<string | null>(null);

	const queryClient = useQueryClient();
	const createMutation = useMutation({
		mutationFn: createQuestionFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["questions"] });
			setCreating(false);
			setPrompt("");
			setExactAnswer("");
			setOptions([{ label: "" }, { label: "" }]);
			setCriteria([{ label: "", max: 10 }]);
			setError(null);
		},
		onError: () => setError("Could not create question."),
	});
	const deleteMutation = useMutation({
		mutationFn: deleteQuestionFn,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["questions"] }),
	});

	const validObjective =
		type === "objective" &&
		prompt.trim() !== "" &&
		options.filter((o) => o.label.trim()).length >= 2 &&
		options.some((o) => o.correct);
	const validSubjective =
		type === "subjective" &&
		prompt.trim() !== "" &&
		criteria.filter((c) => c.label.trim() && c.max > 0).length > 0;

	return (
		<div className="rise-in">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="display-title text-3xl font-bold">Question bank</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Institution-wide shared pool. Exams reference these, never copy.
					</p>
				</div>
				{!creating && (
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
					>
						New question
					</button>
				)}
			</div>

			{creating && (
				<div className="island-shell mt-6 rounded-2xl p-6">
					<div className="flex gap-2">
						{(["objective", "subjective"] as const).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setType(t)}
								className={
									type === t
										? "rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
										: "rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium"
								}
							>
								{t}
							</button>
						))}
					</div>

					<label className="mt-4 block text-sm font-medium">
						Prompt
						<textarea
							className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
						/>
					</label>

					{type === "objective" ? (
						<>
							<div className="mt-4">
								<p className="text-sm font-medium">
									Options (mark one correct)
								</p>
								{options.map((opt, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: options have no stable id while editing
									<div key={i} className="mt-2 flex items-center gap-2">
										<button
											type="button"
											title="Mark correct"
											onClick={() =>
												setOptions(
													options.map((o, j) => ({ ...o, correct: i === j })),
												)
											}
											className={
												opt.correct
													? "h-5 w-5 shrink-0 rounded-full bg-palm text-xs text-white"
													: "h-5 w-5 shrink-0 rounded-full border border-input bg-background"
											}
										>
											{opt.correct ? "✓" : ""}
										</button>
										<input
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
											value={opt.label}
											onChange={(e) =>
												setOptions(
													options.map((o, j) =>
														i === j ? { ...o, label: e.target.value } : o,
													),
												)
											}
										/>
										<button
											type="button"
											onClick={() =>
												setOptions(options.filter((_, j) => j !== i))
											}
											className="text-sm text-muted-foreground"
										>
											✕
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={() => setOptions([...options, { label: "" }])}
									className="mt-2 text-sm font-medium"
								>
									+ Add option
								</button>
							</div>
							<label className="mt-4 block text-sm font-medium">
								Exact answer (fill-in; optional if using options)
								<input
									className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
									value={exactAnswer}
									onChange={(e) => setExactAnswer(e.target.value)}
								/>
							</label>
						</>
					) : (
						<div className="mt-4">
							<p className="text-sm font-medium">Rubric criteria</p>
							{criteria.map((c, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: criteria have no stable id while editing
								<div key={i} className="mt-2 flex items-center gap-2">
									<input
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
										value={c.label}
										onChange={(e) =>
											setCriteria(
												criteria.map((x, j) =>
													i === j ? { ...x, label: e.target.value } : x,
												),
											)
										}
									/>
									<input
										type="number"
										min={1}
										className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm"
										value={c.max}
										onChange={(e) =>
											setCriteria(
												criteria.map((x, j) =>
													i === j ? { ...x, max: Number(e.target.value) } : x,
												),
											)
										}
									/>
									<button
										type="button"
										onClick={() =>
											setCriteria(criteria.filter((_, j) => j !== i))
										}
										className="text-sm text-muted-foreground"
									>
										✕
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={() =>
									setCriteria([...criteria, { label: "", max: 10 }])
								}
								className="mt-2 text-sm font-medium"
							>
								+ Add criterion
							</button>
						</div>
					)}

					{error && <p className="mt-3 text-sm text-destructive">{error}</p>}
					<div className="mt-5 flex gap-3">
						<button
							type="button"
							disabled={
								type === "objective" ? !validObjective : !validSubjective
							}
							onClick={() => {
								if (type === "objective") {
									createMutation.mutate({
										data: {
											type: "objective",
											prompt,
											options: options.filter((o) => o.label.trim()),
											exactAnswer: exactAnswer.trim() || undefined,
										},
									});
								} else {
									createMutation.mutate({
										data: {
											type: "subjective",
											prompt,
											rubric: {
												criteria: criteria.filter(
													(c) => c.label.trim() && c.max > 0,
												),
											} satisfies QuestionRubric,
										},
									});
								}
							}}
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
				{questions?.map((q) => (
					<div
						key={q.id}
						className="feature-card rounded-xl border border-line p-4"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm font-medium">{q.prompt}</p>
								<p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{q.type}
									{q.options?.length
										? ` · ${q.options.length} options`
										: q.exactAnswer
											? ` · exact: ${q.exactAnswer}`
											: ` · ${q.rubric?.criteria.length} rubric criteria`}
								</p>
							</div>
							<button
								type="button"
								onClick={() => deleteMutation.mutate({ data: { id: q.id } })}
								className="text-sm text-muted-foreground hover:text-destructive"
							>
								Delete
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
