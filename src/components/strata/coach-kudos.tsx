import { useState } from "react";
import { Check, Send, ThumbsUp } from "lucide-react";
import { useAct } from "@/lib/api";
import { kudosDraft } from "@/lib/coach";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function CoachKudos({
  clientId,
  name,
  workout,
  open,
  onClose,
}: {
  clientId: string;
  name: string | null;
  workout?: { title: string } | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const [body, setBody] = useState(() => kudosDraft(name, workout));
  const [sent, setSent] = useState(false);
  const send = useAct((api, message: string) => api.addNote(clientId, message));
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !send.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-40px)] max-w-sm overflow-y-auto rounded-card p-5">
        <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-volt">
          {sent ? <Check /> : <ThumbsUp />}
        </div>
        <DialogTitle className="pr-5 font-display text-title">
          {sent ? "Kudos sent" : `A little lift for ${name?.split(" ")[0] ?? "your client"}`}
        </DialogTitle>
        <DialogDescription>
          {sent
            ? "Your note is on their Today screen."
            : (workout?.title ?? "A note from their coach")}
        </DialogDescription>
        {sent ? (
          <>
            <p className="break-words text-body">{body}</p>
            <Button variant="glass" className="h-12" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (body.trim() && !send.isPending)
                send.mutate(body.trim(), { onSuccess: () => setSent(true) });
            }}
          >
            <Textarea
              aria-label="Kudos note"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="resize-none text-body"
            />
            {send.error && (
              <p role="alert" className="text-label text-destructive">
                Couldn’t send. Your note is still here. Try again.
              </p>
            )}
            <Button
              type="submit"
              variant="volt"
              size="xl"
              className="w-full"
              disabled={!body.trim() || send.isPending}
            >
              <Send />
              {send.isPending ? "Sending…" : "Send kudos"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
