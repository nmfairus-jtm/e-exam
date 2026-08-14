import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import {
	addQuestionsFn,
	distributeExamFn,
	getExamFn,
	listStudentsFn,
	publishExamFn,
} from "#/lib/exams";
import { listQuestionsFn } from "#/lib/questions";
import {
	approveGradingFn,
	closeExamFn,
	getGradingDashboardFn,
	releaseResultsFn,
} from "#/lib/to-exam";

export const Route = createFileRoute("/app/exam-builder/$examId")({
	component: ExamBuilder,
});

function ExamBuilder() {
	const { examId } = useParams({ from: "/app/exam-builder/$examId" });
	const { data, isLoading } = useQuery({
		queryKey: ["exam", examId],
		queryFn: () => getExamFn({ data: { id: examId } }),
	});
	const { data: questions } = useQuery({
		queryKey: ["questions"],
		queryFn: () => listQuestionsFn(),
	});
	const { data: students } = useQuery({
		queryKey: ["students"],
		queryFn: () => listStudentsFn(),
	});
	const { data: dashboard } = useQuery({
		queryKey: ["grading", examId],
		queryFn: () => getGradingDashboardFn({ data: { examId } }),
		retry: false,
	});
	const queryClient = useQueryClient();

	const [selected, setSelected] = useState<string[]>([]);
	const [pointValues, setPointValues] = useState<Record<string, number>>({});
	const [distributeIds, setDistributeIds] = useState<string[]>([]);
	const invalidate = (keys: string[][]) => {
		for (const k of keys) {
			queryClient.invalidateQueries({ queryKey: k });
		}
	};

	const addMutation = useMutation({
		mutationFn: addQuestionsFn,
		onSuccess: () => {
			invalidate([["exam", examId], ["questions"]]);
			setSelected([]);
			setPointValues({});
		},
	});
	const publishMutation = useMutation({
		mutationFn: publishExamFn,
		onSuccess: () => invalidate([["exam", examId]]),
	});
	const distributeMutation = useMutation({
		mutationFn: distributeExamFn,
		onSuccess: () => {
			invalidate([["exam", examId]]);
			setDistributeIds([]);
		},
	});

	if (isLoading) {
		return <p>Loading…</p>;
	}
	if (!data) {
		return <p>Exam not found.</p>;
	}

	const { exam, sections } = data;
	const isEditable = exam.state === "draft";
	const isLive = exam.state === "live";

	const total = sections.reduce(
		(s, sec) => s + sec.questions.reduce((qSum, q) => qSum + q.pointValue, 0),
		0,
	);

	return (
		<div className="rise-in">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="display-title text-3xl font-bold">{exam.title}</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{exam.state} · {total} pts total
						{exam.passMark != null ? ` · pass ${exam.passMark}` : ""}
					</p>
				</div>
				<Link to="/app/exams" className="text-sm font-medium">
					Back to exams
				</Link>
			</div>

			{isEditable && (
				<div className="island-shell mt-6 rounded-2xl p-6">
					<h2 className="text-lg font-bold">Add questions from bank</h2>
					<div className="mt-3 space-y-2">
						{questions?.map((q) => (
							<label
								key={q.id}
								className="flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-sm"
							>
								<input
									type="checkbox"
									checked={selected.includes(q.id)}
									onChange={(e) =>
										setSelected((prev) =>
											e.target.checked
												? [...prev, q.id]
												: prev.filter((id) => id !== q.id),
										)
									}
								/>
								<span className="flex-1">
									<span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{q.type}
									</span>
									{q.prompt}
								</span>
								<input
									type="number"
									min={1}
									placeholder="points"
									className="w-20 rounded-md border border-input px-2 py-1 text-sm"
									value={pointValues[q.id] ?? 1}
									onChange={(e) =>
										setPointValues((prev) => ({
											...prev,
											[q.id]: Number(e.target.value),
										}))
									}
								/>
							</label>
						))}
						{!questions?.length && (
							<p className="text-sm text-muted-foreground">
								No questions in the bank yet.
							</p>
						)}
					</div>
					<button
						type="button"
						disabled={selected.length === 0}
						onClick={() =>
							addMutation.mutate({
								data: {
									examId,
									questionRefs: selected.map((qid, i) => ({
										questionId: qid,
										position: i,
										pointValue: pointValues[qid] ?? 1,
									})),
								},
							})
						}
						className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
					>
						Add to exam
					</button>
				</div>
			)}

			<div className="mt-6 space-y-6">
				{sections.map((section) => (
					<section key={section.id} className="island-shell rounded-2xl p-6">
						<h2 className="display-title text-xl font-bold">{section.title}</h2>
						<div className="mt-3 space-y-2">
							{section.questions.map((q, i) => (
								<div
									key={q.id}
									className="rounded-lg border border-input bg-background px-4 py-2 text-sm"
								>
									<span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{i + 1} · {q.snapshotType} · {q.pointValue} pts
									</span>
									{q.snapshotPrompt}
								</div>
							))}
							{section.questions.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No questions in this section.
								</p>
							)}
						</div>
					</section>
				))}
			</div>

			{isEditable && (
				<div className="mt-6 flex gap-3">
					<button
						type="button"
						disabled={
							sections.length === 0 ||
							sections.every((s) => s.questions.length === 0)
						}
						onClick={() => publishMutation.mutate({ data: { id: examId } })}
						className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
					>
						Publish to live
					</button>
				</div>
			)}

			{isLive && (
				<div className="island-shell mt-6 rounded-2xl p-6">
					<h2 className="text-lg font-bold">Distribute to students</h2>
					<div className="mt-3 space-y-2">
						{students?.map((student) => (
							<label
								key={student.id}
								className="flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-sm"
							>
								<input
									type="checkbox"
									checked={distributeIds.includes(student.id)}
									onChange={(e) =>
										setDistributeIds((prev) =>
											e.target.checked
												? [...prev, student.id]
												: prev.filter((id) => id !== student.id),
										)
									}
								/>
								{student.name} ({student.email})
							</label>
						))}
					</div>
					<button
						type="button"
						disabled={distributeIds.length === 0}
						onClick={() =>
							distributeMutation.mutate({
								data: { examId, studentIds: distributeIds },
							})
						}
						className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
					>
						Distribute
					</button>
				</div>
			)}

			{(!isEditable || exam.state === "closed") && (
				<GradingPanel
					examId={examId}
					examState={exam.state}
					dashboard={dashboard}
					invalidate={() =>
						invalidate([
							["grading", examId],
							["exam", examId],
						])
					}
				/>
			)}
		</div>
	);
}

function GradingPanel({
	examId,
	examState,
	dashboard,
	invalidate,
}: {
	examId: string;
	examState: string;
	dashboard?: {
		submission: { id: string; studentId: string };
		studentName: string;
		total: { earned: number; max: number };
		subjective: {
			id: string;
			status: "proposed" | "approved";
			proposedMark: number;
			rationale: string | null;
			prompt: string;
			approvedMark: number | null;
		}[];
	}[];
	invalidate: () => void;
}) {
	const queryClient = useQueryClient();
	const [marks, setMarks] = useState<Record<string, number>>({});
	const approveMutation = useMutation({
		mutationFn: approveGradingFn,
		onSuccess: () => {
			invalidate();
			queryClient.invalidateQueries({ queryKey: ["grading", examId] });
		},
	});
	const closeMutation = useMutation({
		mutationFn: closeExamFn,
		onSuccess: invalidate,
	});
	const releaseMutation = useMutation({
		mutationFn: releaseResultsFn,
		onSuccess: invalidate,
	});

	return (
		<div className="island-shell mt-6 rounded-2xl p-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-bold">Grading</h2>
				{examState === "live" && (
					<button
						type="button"
						onClick={() => closeMutation.mutate({ data: { id: examId } })}
						className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
					>
						Close exam
					</button>
				)}
				{examState === "closed" && (
					<button
						type="button"
						onClick={() => releaseMutation.mutate({ data: { id: examId } })}
						className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
					>
						Release results
					</button>
				)}
			</div>

			<div className="mt-4 space-y-4">
				{(!dashboard || dashboard.length === 0) && (
					<p className="text-sm text-muted-foreground">No submissions yet.</p>
				)}
				{dashboard?.map((item) => (
					<div
						key={item.submission.id}
						className="rounded-xl border border-input bg-background p-4"
					>
						<div className="flex items-center justify-between">
							<p className="font-medium">{item.studentName}</p>
							<p className="text-sm font-semibold">
								{item.total.earned} / {item.total.max}
							</p>
						</div>
						{item.subjective.length > 0 && (
							<div className="mt-3 space-y-3">
								{item.subjective.map((g) => (
									<div key={g.id} className="border-t pt-3">
										<p className="text-sm font-medium">{g.prompt}</p>
										<p className="mt-1 text-sm text-muted-foreground">
											{examState === "live"
												? g.status === "approved"
													? `Approved: ${g.approvedMark}`
													: `Proposed: ${g.proposedMark}`
												: g.rationale
													? `Proposed ${g.proposedMark} — ${g.rationale}`
													: `Proposed: ${g.proposedMark}`}
										</p>
										{g.status === "proposed" && (
											<div className="mt-2 flex items-center gap-2">
												<input
													type="number"
													className="w-20 rounded-md border border-input px-2 py-1 text-sm"
													value={marks[g.id] ?? g.proposedMark}
													onChange={(e) =>
														setMarks((prev) => ({
															...prev,
															[g.id]: Number(e.target.value),
														}))
													}
												/>
												<button
													type="button"
													onClick={() =>
														approveMutation.mutate({
															data: {
																gradingId: g.id,
																approvedMark: marks[g.id] ?? g.proposedMark,
															},
														})
													}
													className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background"
												>
													Approve
												</button>
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
