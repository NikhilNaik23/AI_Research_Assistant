import React from "react";

const STAGES = [
  { key: "planning", label: "Supervisor", detail: "Planning the workflow" },
  { key: "researching", label: "Researcher", detail: "Gathering sources" },
  { key: "writing", label: "Writer", detail: "Drafting the report" },
  { key: "reviewing", label: "Reviewer", detail: "Checking claims" },
];

// A sequence really is a sequence here, so a numbered stepper is earned:
// this mirrors the actual Supervisor -> Researcher -> Writer -> Reviewer pipeline.
export default function PipelineTimeline({ status, iteration, error }) {
  const currentIndex = STAGES.findIndex((s) => s.key === status);
  const isDone = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="border border-line bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, i) => {
          const done = isDone || i < currentIndex;
          const active = !isDone && !isFailed && i === currentIndex;
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-1 flex-col items-center text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                    done
                      ? "border-pine bg-pine text-white"
                      : active
                      ? "border-gold bg-gold-light text-gold animate-pulse"
                      : isFailed
                      ? "border-line text-ink/30"
                      : "border-line text-ink/40"
                  }`}
                >
                  {i + 1}
                </div>
                <p className={`mt-2 text-sm font-medium ${done || active ? "text-ink" : "text-ink/40"}`}>
                  {stage.label}
                </p>
                <p className="text-xs text-ink/45">{stage.detail}</p>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${done ? "bg-pine" : "bg-line"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {iteration ? (
        <p className="mt-6 text-center text-xs text-ink/50">Iteration {iteration}</p>
      ) : null}
      {isFailed && (
        <p className="mt-6 text-center text-sm text-rust">{error || "The pipeline hit an error — see the log below."}</p>
      )}
    </div>
  );
}
