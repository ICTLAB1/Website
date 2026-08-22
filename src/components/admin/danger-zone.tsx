import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input } from "@/components/ui/form";
import { archiveRecord, deleteRecordPermanently } from "@/app/admin/record-actions";
import type { DeletableConfig } from "@/lib/admin/deletable";

/**
 * The removal controls at the foot of a record's page.
 *
 * Two removals, presented as the different things they are.
 *
 * **Archive** is one button. It is reversible, so making it easy costs nothing
 * and making it hard would only push people towards the permanent one.
 *
 * **Delete permanently** is folded away inside a `<details>` and asks for the
 * record's own reference to be typed. Not a confirm dialog: those get dismissed
 * without being read, and the thing they fail to prevent is not recklessness but
 * the wrong row — an operator on the record they believe they are on, who is
 * not. Typing `ORD-2026-4KQ2XA` cannot be done by accident and cannot be done
 * while looking at a different order.
 *
 * The list of what else goes is not decoration. Deleting an order takes its
 * payments with it, and that is worth reading before the fact rather than
 * discovering after.
 */
export function DangerZone({
  config,
  id,
  reference,
  archived = false,
  /** Shown above the permanent-delete control. For records with legal weight. */
  retentionNote,
  showArchive = true,
  className,
}: {
  config: DeletableConfig;
  id: string;
  /** The value that must be typed back — the same string shown on the page. */
  reference: string;
  archived?: boolean;
  retentionNote?: string;
  /**
   * Set false where the screen already carries its own archive control. The
   * product page has had one in its header since long before this component
   * existed, and two buttons doing the same job on one page is worse than
   * either arrangement on its own.
   */
  showArchive?: boolean;
  className?: string;
}) {
  const noun = config.label.singular.toLowerCase();

  return (
    <section
      className={
        className ??
        "mt-10 rounded-[--radius-lg] border border-danger-600/30 bg-danger-50/40 p-5"
      }
    >
      <h2 className="text-[15px] font-semibold text-graphite-900">Remove this {noun}</h2>

      {config.softDelete && showArchive ? (
        <div className="mt-4 border-b border-danger-600/20 pb-5">
          <p className="text-[13px] leading-relaxed text-ink-600">
            {archived
              ? `This ${noun} is archived: it is hidden from every screen and, where it had one, from the public site. Nothing has been destroyed.`
              : `Archiving hides this ${noun} everywhere without destroying anything. You can restore it afterwards.`}
          </p>
          <div className="mt-3 max-w-xs">
            <AdminForm
              action={archiveRecord}
              submitLabel={archived ? `Restore this ${noun}` : `Archive this ${noun}`}
              pendingLabel="Working…"
              variant={archived ? "outline" : "danger"}
              hidden={{ __deletable: config.key, __id: id }}
              compact
            />
          </div>
        </div>
      ) : null}

      <details className="group mt-4">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-danger-700 underline-offset-2 hover:underline">
          Delete permanently
        </summary>

        <div className="mt-4 space-y-4">
          <div className="text-[13px] leading-relaxed text-ink-700">
            <p>
              This destroys the {noun} and cannot be undone from anywhere in this panel. It also
              removes:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-600">
              {config.cascades.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {retentionNote ? (
            <p className="rounded-[--radius-md] border border-warning-600/40 bg-warning-50 p-3 text-[13px] leading-relaxed text-graphite-900">
              {retentionNote}
            </p>
          ) : null}

          <AdminForm
            action={deleteRecordPermanently}
            submitLabel={`Delete this ${noun} permanently`}
            pendingLabel="Deleting…"
            variant="danger"
            hidden={{ __deletable: config.key, __id: id }}
            compact
          >
            <Field
              name="__confirm"
              label={`Type the ${config.confirmLabel} to confirm`}
              hint={reference}
              required
            >
              <Input
                name="__confirm"
                autoComplete="off"
                spellCheck={false}
                // No `defaultValue`. Pre-filling it would defeat the entire
                // point of asking.
                placeholder={config.confirmLabel}
              />
            </Field>
          </AdminForm>
        </div>
      </details>
    </section>
  );
}
