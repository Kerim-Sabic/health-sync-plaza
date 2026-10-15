import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useMe, useQ } from "@/lib/api";
import { Avatar, Empty, Skeleton } from "@/components/strata/ui";
import { Thread } from "@/components/strata/thread";
import { coachFirst } from "@/lib/stats";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "Messages — Kinra" }, { name: "robots", content: "noindex" }] }),
  component: Messages,
});

function Messages() {
  const me = useMe().data;
  const coach = useQ(["my-trainer"], (api) => api.myTrainer(), me?.role === "client");
  if (!me) return null;
  return (
    <div className="mx-auto max-w-[640px]">
      <Link
        to="/app"
        className="-ml-2 mb-3 inline-flex min-h-[44px] items-center gap-1 rounded-full px-2 text-label font-semibold text-muted-foreground transition-colors hover-device:text-foreground"
      >
        <ChevronLeft className="size-5" /> Today
      </Link>
      {coach.isLoading ? (
        <Skeleton className="h-16 !rounded-card" />
      ) : !coach.data ? (
        <Empty
          icon={<MessageSquare className="size-6" />}
          title="Connect with your coach"
          body="Once you join with their code, your conversation lives here."
          action={
            <Link to="/app/me" className="text-label font-semibold text-primary">
              Enter a coach code
            </Link>
          }
        />
      ) : (
        <>
          <header className="mb-6 flex items-center gap-3">
            <Avatar name={coach.data.display_name} src={coach.data.avatar_url} size={48} />
            <div className="min-w-0">
              <h1 className="truncate font-display text-title font-bold">
                {coach.data.display_name}
              </h1>
              <div className="text-caption text-faint">
                Your coach · usually replies within the day
              </div>
            </div>
          </header>
          <Thread
            clientId={me.id}
            viewer="client"
            other={{ name: coach.data.display_name, avatar: coach.data.avatar_url }}
          />
          <p className="mt-3 text-center text-caption text-faint">
            Only you and {coachFirst(coach.data.display_name)} can see this conversation.
          </p>
        </>
      )}
    </div>
  );
}
