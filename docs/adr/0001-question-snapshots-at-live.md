# Question snapshots freeze at live, not live references

When an exam transitions to live, it stores a snapshot of each referenced question rather than a reference into the shared bank. Later edits to a bank question never change what takers saw or how their submissions are scored.

We picked snapshots over live references because grading an identical question against a changed answer key would give two students different marks for the same answer. The bank stays editable for future exams; a live exam is sealed.
