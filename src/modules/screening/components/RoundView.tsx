import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRound, reviseQuestion } from "@/lib/roundApi";
import { ApiError } from "@/lib/api";
import { ReadOnlyError } from "@/lib/accountSession";
import { useAccount } from "@/hooks/useAccount";
import {
  useRoundWriteLock,
  ROUND_WRITE_BUSY_MESSAGE,
} from "@/modules/screening/hooks/round/useRoundWriteLock";
import type { CodingExample, JudgingSummary, Question, RoundResponse } from "@/types";

interface RoundViewProps {
  roundId: string;
}

// The live view of the round itself: budget, requirements, and every
// question, sitting beside AuthoringChat (Task 12) where the hiring manager
// argues with the AI about what to ask. Deliberately reads round state from
// the same TanStack Query cache entry AuthoringChat writes to on every turn
// (["round", roundId]) instead of taking it as a prop — see AuthoringChat's
// top-of-file comment for why the state lives there and only there. Mounted
// with no custom query options: the app-wide 5 minute staleTime and
// refetchOnWindowFocus:false (set on the query client) are exactly what
// stop a background refetch from clobbering a turn result AuthoringChat
// just wrote. Overriding staleTime here would reintroduce that bug.
export default function RoundView({ roundId }: RoundViewProps) {
  const { canWrite } = useAccount();
  const queryClient = useQueryClient();
  const { isActive } = useRoundWriteLock();

  const { data: round } = useQuery({
    queryKey: ["round", roundId],
    queryFn: () => getRound(roundId),
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const isFrozen = round ? round.status !== "draft" : false;

  // A publish (or a 409 that invalidates the cache) can land while a
  // QuestionEditForm is open. Without this, editingId survives the round
  // going frozen: RoundView keeps rendering a live Save button while
  // AuthoringChat shows the frozen banner and PublishGate shows Published:
  // two contradictory states on screen with nothing to reconcile them until
  // the user navigates away. See final review item 1. Runs before the
  // `!round` guard below so hook order stays stable across renders.
  useEffect(() => {
    if (isFrozen) setEditingId(null);
  }, [isFrozen]);

  if (!round) return null;

  const canEdit = !isFrozen && canWrite;
  const allocated = round.questions.reduce((sum, q) => sum + q.allocated_minutes, 0);
  const target = round.total_minutes - round.overhead_minutes;
  // True the instant any row's QuestionEditForm mutation goes pending, read
  // back from the shared lock rather than local state; that's what lets
  // every row's Edit toggle disable together, not just the row that started
  // the save. See final review item 2.
  const editSaving = isActive("edit");

  // The endpoint an inline edit saves through (POST /rounds/{rid}/tool-calls
  // with revise_question) returns the full updated round, the same shape
  // ChatTurnResponse.round is. Writing it into the shared cache entry the
  // same way AuthoringChat does is what keeps both halves of the screen
  // consistent, whichever one made the change.
  function handleSaved(updated: RoundResponse) {
    queryClient.setQueryData(["round", roundId], updated);
  }

  function handleFrozenMidEdit() {
    queryClient.invalidateQueries({ queryKey: ["round", roundId] });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E8E5DF] bg-white p-4">
      <BudgetLine
        questionCount={round.questions.length}
        allocated={allocated}
        target={target}
        totalMinutes={round.total_minutes}
      />

      <RequirementsLine requirements={round.requirements} />

      {/* Every other disabled control on this screen explains itself
          (AuthoringChat's frozen/read-only banners, PublishGate's blocking
          reason). The Edit button on each row was the one exception. See
          final review item 7. */}
      {!canEdit && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          {isFrozen
            ? round.status === "published"
              ? "This round is published and frozen. Clone it below to make changes."
              : "This round is archived and can no longer be edited."
            : "Read-only: you can view these questions but not edit them."}
        </p>
      )}

      {round.questions.length === 0 ? (
        <p className="text-sm text-[#737373]">
          No questions yet. Chat with the assistant to start building this round.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {round.questions.map((question, index) => (
            <QuestionRow
              key={question.id}
              roundId={roundId}
              index={index}
              question={question}
              judging={round.judging?.[question.id]}
              isEditing={editingId === question.id}
              canEdit={canEdit}
              editSaving={editSaving}
              onToggleEdit={() =>
                setEditingId((current) => (current === question.id ? null : question.id))
              }
              onSaved={(updated) => {
                handleSaved(updated);
                setEditingId(null);
              }}
              onFrozenMidEdit={handleFrozenMidEdit}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

// "6 questions · 48/48 min · 60 total" — the point of the screen. The
// backend guarantees sum(allocated_minutes) == total_minutes -
// overhead_minutes on every SAVED round, so an unsatisfied state should be
// rare in practice, but it is rendered honestly (amber) whenever it occurs
// rather than assumed impossible — e.g. mid-turn network hiccups, or simply
// zero questions with a non-zero budget.
function BudgetLine({
  questionCount,
  allocated,
  target,
  totalMinutes,
}: {
  questionCount: number;
  allocated: number;
  target: number;
  totalMinutes: number;
}) {
  // A brand-new round (zero questions) has an unsatisfied allocation by
  // definition; that is not an alarm, it is the starting state, and the
  // "No questions yet" line below already carries the next action. Only
  // treat a mismatch as noteworthy once there is at least one question. See
  // final review item 5.
  const satisfied = questionCount === 0 || allocated === target;
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
        satisfied
          ? "border-[#E8E5DF] bg-[#F5F3EE] text-[#0F0F0F]"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {questionCount} question{questionCount === 1 ? "" : "s"} &middot; {allocated}/{target} min
      &middot; {totalMinutes} total
      {!satisfied && (
        <span className="ml-2 font-normal text-amber-700">Allocation does not add up.</span>
      )}
    </div>
  );
}

// Requirements are read-only here: camera and screen share are set by the
// conversation (set_requirements is a chat-only tool, never exposed as an
// inline control), not edited from this view.
function RequirementsLine({
  requirements,
}: {
  requirements: RoundResponse["requirements"];
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-[#737373]">
      <RequirementPill label="Camera" required={requirements.camera} />
      <RequirementPill label="Screen share" required={requirements.screen_share} />
    </div>
  );
}

function RequirementPill({ label, required }: { label: string; required: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 ${
        required
          ? "border-[#0F0F0F20] bg-[#F5F3EE] text-[#0F0F0F]"
          : "border-[#E8E5DF] bg-white text-[#A3A3A3]"
      }`}
    >
      {label}: {required ? "required" : "not required"}
    </span>
  );
}

interface QuestionRowProps {
  roundId: string;
  index: number;
  question: Question;
  // This question's hidden checks. Undefined for a spoken question.
  judging?: JudgingSummary;
  isEditing: boolean;
  canEdit: boolean;
  // True while ANY row's QuestionEditForm save is in flight (read from the
  // shared write lock in RoundView, not local state): the header toggle
  // used to be gated on `!canEdit` only, so clicking Edit/Cancel on this
  // row OR ANY OTHER ROW while a save was pending unmounted that form
  // mid-POST. The form's own unmount cleanup releases the write lock
  // regardless of whether the request has actually finished, so chat and
  // publish would re-enable and could clobber the still-running write. See
  // final review item 2.
  editSaving: boolean;
  onToggleEdit: () => void;
  onSaved: (round: RoundResponse) => void;
  onFrozenMidEdit: () => void;
}

function QuestionRow({
  roundId,
  index,
  question,
  judging,
  isEditing,
  canEdit,
  editSaving,
  onToggleEdit,
  onSaved,
  onFrozenMidEdit,
}: QuestionRowProps) {
  return (
    <li className="rounded-xl border border-[#E8E5DF] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#737373]">
            <span className="font-medium text-[#0F0F0F]">{index + 1}.</span>
            <span className="uppercase tracking-wide">{question.kind}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{question.competency_ref}</span>
            <span aria-hidden="true">&middot;</span>
            <span>Weight {question.weight}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{question.allocated_minutes} min</span>
          </div>
          {!isEditing && <QuestionBody question={question} />}
          {question.kind === "coding" && <HiddenChecks judging={judging} />}
        </div>
        <button
          type="button"
          onClick={onToggleEdit}
          disabled={!canEdit || editSaving}
          className="h-7 shrink-0 rounded-md border border-[#D4D4D4] bg-white px-2.5 text-xs font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isEditing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Gated on canEdit too, not just isEditing: if the round freezes
          (or write access is lost) while this row's editingId is still
          set, the form disappears on the same render as the rest of the
          screen going read-only, instead of lingering until RoundView's
          own effect clears editingId. Belt-and-suspenders with that
          effect. See final review item 1. Not gated on editSaving: that
          would unmount THIS row's own form the instant its save begins,
          which is the opposite of what item 2 needs. */}
      {isEditing && canEdit && (
        <QuestionEditForm
          roundId={roundId}
          question={question}
          onSaved={onSaved}
          onCancel={onToggleEdit}
          onFrozenMidEdit={onFrozenMidEdit}
        />
      )}
    </li>
  );
}

// Read-only body. Narrows on `kind` (never a cast) because a spoken
// question and a coding question genuinely carry different fields — TS
// only lets the coding-only fields through once the discriminant check has
// happened.
function QuestionBody({ question }: { question: Question }) {
  if (question.kind === "spoken") {
    return <p className="mt-2 text-sm text-[#0F0F0F]">{question.prompt}</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="text-sm font-medium text-[#0F0F0F]">{question.title}</p>
      <p className="whitespace-pre-wrap text-sm text-[#404040]">{question.statement_md}</p>
      {question.examples.length === 0 ? (
        <p className="text-xs text-[#A3A3A3]">No examples yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {question.examples.map((example, i) => (
            <ExampleRow key={i} example={example} />
          ))}
        </div>
      )}
    </div>
  );
}

const HIDDEN_CATEGORY_ORDER = ["basic", "edge", "adversarial"];

// Where a coding question's hidden checks stand. The worked examples above
// are what the candidate reads; these are what decides whether their code
// is correct. Shown outside QuestionBody so it stays visible while the
// question is being edited: an edit to the statement or examples is what
// sends the checks back to be verified.
function HiddenChecks({ judging }: { judging: JudgingSummary | undefined }) {
  // A round loaded from an older API response, or a question added before
  // the server has reported on it.
  if (!judging) return null;

  if (!judging.verified) {
    return (
      <p className="mt-2 rounded-lg border border-[#F3D8A8] bg-[#FDECD2] px-2.5 py-1.5 text-xs text-[#8A4B08]">
        <span className="font-medium">Hidden checks not verified.</span>{" "}
        {judging.error ?? "This question cannot be published until they are."}
      </p>
    );
  }

  const breakdown = HIDDEN_CATEGORY_ORDER.filter((c) => judging.counts[c])
    .map((c) => `${judging.counts[c]} ${c}`)
    .join(", ");

  return (
    <details className="mt-2 rounded-lg border border-[#BBE5CA] bg-[#E7F5EC] text-xs text-[#166534]">
      <summary className="cursor-pointer select-none px-2.5 py-1.5 font-medium">
        {judging.tests.length} hidden checks verified{breakdown ? `: ${breakdown}` : ""}
      </summary>
      <div className="flex flex-col gap-1.5 border-t border-[#BBE5CA] bg-white px-2.5 py-2 text-[#404040]">
        <p className="text-[#737373]">
          The candidate never sees these. Each expected output is what the reference solution
          printed when it was run.
        </p>
        {judging.tests.map((test, i) => (
          <div key={i} className="rounded-lg bg-[#F5F3EE] px-2.5 py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
              {test.category}
            </div>
            <div className="whitespace-pre-wrap break-words font-mono">
              <span className="font-sans font-medium text-[#0F0F0F]">Input:</span> {test.input}
            </div>
            <div className="whitespace-pre-wrap break-words font-mono">
              <span className="font-sans font-medium text-[#0F0F0F]">Expected:</span> {test.expected}
            </div>
          </div>
        ))}
        {judging.reference_solution && (
          <div>
            <p className="mb-1 font-medium text-[#0F0F0F]">Reference solution</p>
            <pre className="max-h-64 overflow-auto rounded-lg bg-[#0F0F0F] p-2.5 text-[11px] leading-relaxed text-[#F5F3EE]">
              <code>{judging.reference_solution}</code>
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

function ExampleRow({ example }: { example: CodingExample }) {
  return (
    <div className="rounded-lg bg-[#F5F3EE] px-2.5 py-1.5 text-xs text-[#404040]">
      <div>
        <span className="font-medium text-[#0F0F0F]">Input:</span> {example.input}
      </div>
      <div>
        <span className="font-medium text-[#0F0F0F]">Output:</span> {example.output}
      </div>
      {example.note && <div className="text-[#737373]">{example.note}</div>}
    </div>
  );
}

// Editable subset of a question's fields, mirroring exactly what the
// backend's revise_question tool accepts in `changes` (see
// _REVISABLE_QUESTION_PROPS in authoring/tools.py): the spine minus id/kind,
// plus prompt for spoken or title/statement_md/examples for coding. id and
// kind are structural and never revised in place.
interface EditState {
  competency_ref: string;
  expected_answer: string;
  grading_notes: string;
  weight: string;
  allocated_minutes: string;
  prompt: string;
  title: string;
  statement_md: string;
  examples: CodingExample[];
}

function buildEditState(question: Question): EditState {
  return {
    competency_ref: question.competency_ref,
    expected_answer: question.expected_answer,
    grading_notes: question.grading_notes,
    weight: String(question.weight),
    allocated_minutes: String(question.allocated_minutes),
    prompt: question.kind === "spoken" ? question.prompt : "",
    title: question.kind === "coding" ? question.title : "",
    statement_md: question.kind === "coding" ? question.statement_md : "",
    examples: question.kind === "coding" ? question.examples : [],
  };
}

// Only the fields that actually changed go into the request, mirroring the
// tool's own contract ("Only the fields being changed"). Numeric fields are
// parsed and compared numerically so a value re-typed identically doesn't
// count as a change.
function diffEditState(question: Question, edited: EditState): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  if (edited.competency_ref !== question.competency_ref) {
    changes.competency_ref = edited.competency_ref;
  }
  if (edited.expected_answer !== question.expected_answer) {
    changes.expected_answer = edited.expected_answer;
  }
  if (edited.grading_notes !== question.grading_notes) {
    changes.grading_notes = edited.grading_notes;
  }

  const weight = Number(edited.weight);
  if (Number.isFinite(weight) && weight !== question.weight) {
    changes.weight = weight;
  }

  const allocatedMinutes = Number(edited.allocated_minutes);
  if (Number.isFinite(allocatedMinutes) && allocatedMinutes !== question.allocated_minutes) {
    changes.allocated_minutes = allocatedMinutes;
  }

  if (question.kind === "spoken" && edited.prompt !== question.prompt) {
    changes.prompt = edited.prompt;
  }

  if (question.kind === "coding") {
    if (edited.title !== question.title) changes.title = edited.title;
    if (edited.statement_md !== question.statement_md) changes.statement_md = edited.statement_md;
    if (JSON.stringify(edited.examples) !== JSON.stringify(question.examples)) {
      changes.examples = edited.examples;
    }
  }

  return changes;
}

interface QuestionEditFormProps {
  roundId: string;
  question: Question;
  onSaved: (round: RoundResponse) => void;
  onCancel: () => void;
  onFrozenMidEdit: () => void;
}

function QuestionEditForm({
  roundId,
  question,
  onSaved,
  onCancel,
  onFrozenMidEdit,
}: QuestionEditFormProps) {
  const [edited, setEdited] = useState<EditState>(() => buildEditState(question));
  const { isBlocked, setBusy } = useRoundWriteLock();

  const saveMutation = useMutation({
    mutationFn: (changes: Record<string, unknown>) =>
      reviseQuestion(roundId, question.id, changes),
    onSuccess: (updated) => {
      onSaved(updated);
    },
    onError: (err) => {
      // A 409 means the round was published (frozen) while this edit was in
      // flight. Refetch so the rest of the view picks up the frozen state
      // (every Edit button disables) rather than leaving a live-looking
      // form that would 409 again on retry.
      if (err instanceof ApiError && err.status === 409) {
        onFrozenMidEdit();
      }
      // On 422 (rejected) or any other error, deliberately do nothing here:
      // `edited` is untouched, so the hiring manager's input is still on
      // screen and the error renders below the form.
    },
  });

  // Register this save as a round write while it's in flight, under this
  // form's own key ("edit"). Mirrors `isPending` so the flag clears on
  // success or error alike, and releases on unmount as a defensive
  // backstop. This form's own Cancel button, AND every row's header
  // Edit/Cancel toggle (QuestionRow, driven by RoundView's `editSaving` =
  // isActive("edit")), are now disabled while a save is pending, so this
  // form can't normally unmount mid-save, but a stale lock would be worse
  // than a redundant clear if some other path still managed it. Previously
  // only this form's own Cancel button was disabled, which missed every
  // row's header toggle; see final review item 2.
  useEffect(() => {
    setBusy("edit", saveMutation.isPending);
  }, [saveMutation.isPending, setBusy]);
  useEffect(() => () => setBusy("edit", false), [setBusy]);

  // True while some OTHER write surface (a chat turn or a publish) is in
  // flight: each writes the whole round from a draft it read before this
  // edit existed, so saving now would race it: whichever write lands
  // second wins, and the other vanishes with no error. Named chatInFlight
  // for history, but isBlocked("edit") covers publish too now that it
  // registers with the same lock. See useRoundWriteLock.tsx.
  const chatInFlight = isBlocked("edit");

  function update<K extends keyof EditState>(key: K, value: EditState[K]) {
    setEdited((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (chatInFlight || saveMutation.isPending) return;
    const changes = diffEditState(question, edited);
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }
    saveMutation.mutate(changes);
  }

  function addExample() {
    update("examples", [...edited.examples, { input: "", output: "", note: "" }]);
  }

  function updateExample(i: number, field: keyof CodingExample, value: string) {
    update(
      "examples",
      edited.examples.map((example, idx) =>
        idx === i ? { ...example, [field]: value } : example,
      ),
    );
  }

  function removeExample(i: number) {
    update(
      "examples",
      edited.examples.filter((_, idx) => idx !== i),
    );
  }

  // total_minutes and overhead_minutes are deliberately absent from this
  // form: the AI owns the round's overall time allocation, this view only
  // ever revises one question at a time via revise_question.
  const errorMessage = saveMutation.isError
    ? saveMutation.error instanceof ApiError
      ? saveMutation.error.status === 409
        ? "This round was published while you were editing, so this change was not saved. It is now frozen; clone it to keep going."
        : saveMutation.error.message
      : saveMutation.error instanceof ReadOnlyError
        ? saveMutation.error.message
        : "Could not reach the server. Your edit is still here, try again."
    : null;

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 border-t border-[#E8E5DF] pt-3">
      <Field label="Competency">
        <input
          type="text"
          value={edited.competency_ref}
          onChange={(e) => update("competency_ref", e.target.value)}
          className={inputClass}
        />
      </Field>

      {question.kind === "spoken" ? (
        <Field label="Prompt">
          <textarea
            value={edited.prompt}
            onChange={(e) => update("prompt", e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>
      ) : (
        <>
          <Field label="Title">
            <input
              type="text"
              value={edited.title}
              onChange={(e) => update("title", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Statement">
            <textarea
              value={edited.statement_md}
              onChange={(e) => update("statement_md", e.target.value)}
              rows={4}
              className={inputClass}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#404040]">Examples</span>
              <button
                type="button"
                onClick={addExample}
                className="text-xs font-medium text-[#0F0F0F] underline underline-offset-2"
              >
                Add example
              </button>
            </div>
            {edited.examples.map((example, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-[#E8E5DF] p-2">
                <input
                  type="text"
                  placeholder="Input"
                  value={example.input}
                  onChange={(e) => updateExample(i, "input", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Output"
                  value={example.output}
                  onChange={(e) => updateExample(i, "output", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={example.note ?? ""}
                  onChange={(e) => updateExample(i, "note", e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeExample(i)}
                  className="self-start text-xs text-red-600 underline underline-offset-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Field label="Expected answer">
        <textarea
          value={edited.expected_answer}
          onChange={(e) => update("expected_answer", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Field>

      <Field label="Grading notes">
        <textarea
          value={edited.grading_notes}
          onChange={(e) => update("grading_notes", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Field>

      <div className="flex gap-3">
        <Field label="Weight (1-5)">
          <input
            type="number"
            min={1}
            max={5}
            value={edited.weight}
            onChange={(e) => update("weight", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Minutes (min 5)">
          <input
            type="number"
            min={5}
            value={edited.allocated_minutes}
            onChange={(e) => update("allocated_minutes", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-red-700">{errorMessage}</p>
        </div>
      )}

      {chatInFlight && !saveMutation.isPending && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-amber-800">{ROUND_WRITE_BUSY_MESSAGE}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saveMutation.isPending || chatInFlight}
          className="h-8 rounded-lg border border-[#0F0F0F] bg-[#0F0F0F] px-3 text-xs font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saveMutation.isPending}
          className="h-8 rounded-lg border border-[#D4D4D4] bg-white px-3 text-xs font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#D4D4D4] bg-white px-2.5 py-1.5 text-sm text-[#0F0F0F] transition-colors placeholder:text-[#A3A3A3] focus:border-[#0F0F0F] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#404040]">{label}</span>
      {children}
    </label>
  );
}
