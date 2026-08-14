# e-exam

An electronic exam platform for a single institution: lecturers create exams, students take them, and results are graded and reported.

## Language

**Exam**:
A test assembled from questions in the question bank, distributed by a lecturer to selected students, taken, graded, and reported on. Exams are flat — not attached to a course or class. An exam moves through the states draft, live, and closed; editing stops when it goes live, and closing is explicit and ends taking.
_Avoid_: paper, quiz, test, assessment

**Question bank**:
The reusable pool of questions an exam is assembled from, shared institution-wide — any lecturer can create, reuse, and reference any question in it. Questions live in the bank, never inline in an exam.
_Avoid_: question pool, repository, item bank

**Question**:
A single item in the question bank. Every question is either an objective question or a subjective question.

**Section**:
A part of an exam that groups its questions and carries its own point subtotal. The exam's total is the sum of its sections' subtotals, and each section's subtotal is the sum of its questions' point values.
_Avoid_: part, group, part

**Objective question**:
A question with a fixed point value, graded automatically against a fixed answer (multiple choice, true/false, fill-in). The fixed answer is part of the Question itself, so every exam reusing a question inherits its scoring.
_Avoid_: auto-graded question, closed question

**Subjective question**:
A question with a point value, graded with a rubric (short answer, essay). The system proposes a grade; the exam's creating lecturer reviews and approves it.
_Avoid_: open question, open-ended question

**Lecturer**:
A user who creates questions in the bank, assembles exams, distributes them to selected students, and approves subjective grades.
_Avoid_: teacher, examiner, professor, instructor

**Student**:
A user who takes exams and receives results.
_Avoid_: candidate, examinee, taker

**Administrator**:
A user who manages accounts and institution-level configuration.
_Avoid_: admin, superuser

**Distribution**:
The act of a lecturer selecting which students may take a published exam. Recipients are picked explicitly per distribution, not derived from a course or group.

**Point value**:
A question's worth in marks. Objective questions are worth exactly their point value when answered correctly; a subjective question's awarded grade is expressed against its point value.

**Submission**:
A student's locked attempt at an exam. A student drafts answers, then submits once; the submission is immutable after submission and grading proceeds from it. Retakes are not part of the model. A distributed student who never submits has no submission, hence no result — not-taken is distinct from scored zero.
_Avoid_: attempt, answer sheet

**Draft**:
The exam's initial state; the exam is still being assembled and can be edited.

**Live**:
The exam's state while students are taking it. Editing stopped at the transition to live, and distribution defines who may take it. The transition to live freezes the exam's questions — the exam carries a snapshot of each referenced question, so later edits to a bank question never change what takers saw or how their submissions are scored.

**Closed**:
The exam's final state. Closing ends taking explicitly; after it, the exam is read-only and its submissions' results are final.

**Result release**:
The act of a lecturer making results visible to students — explicitly, and only after the exam is closed. It is a separate action from closing; a closed exam's results stay hidden until released.

**Result**:
A student's score on an exam, derived from grading their submission. After results are released, a student sees their score plus a per-question breakdown — which objective questions they got right or wrong (the correct answer stays hidden, to protect the shared bank), and their awarded marks on each subjective question. Reporting carries no institution-level or question-level aggregates.

**Pass mark**:
An optional threshold declared per exam. When set, a result is also pass or fail alongside its score; the exam's total must reach the pass mark to pass.
