import { useState, useTransition } from "react";

import { deleteTitleAction } from "@/app/_actions/titles";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Delete from the ficha, behind a confirmation. Success redirects to the
 * title's list from the server (also when the other person already deleted
 * it), so only a failure comes back here.
 */
export function DeleteIsland({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteTitleAction(id);
      if (result && !result.ok) {
        setFailed(true);
        setOpen(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-3 border-t border-rule pt-6">
      <Button
        variant="secondary"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        Eliminar
      </Button>
      {failed && (
        <p role="alert" className="border-2 border-ink p-3 text-sm">
          No se pudo eliminar. Inténtalo de nuevo.
        </p>
      )}
      <ConfirmDialog
        open={open}
        title={`¿Eliminar «${name}»?`}
        description="Se borra para los dos y no se puede deshacer."
        busy={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
