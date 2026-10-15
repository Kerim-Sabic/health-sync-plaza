import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      offset={{ top: "max(12px, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(12px, env(safe-area-inset-top))" }}
      gap={8}
      visibleToasts={3}
      swipeDirections={["top", "left", "right"]}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!rounded-card group-[.toaster]:!bg-popover group-[.toaster]:!text-foreground group-[.toaster]:!border-border group-[.toaster]:!font-sans group-[.toaster]:!text-label",
          description:
            "group-[.toast]:!text-muted-foreground group-[.toast]:!font-medium group-[.toast]:!text-caption",
          actionButton:
            "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-full group-[.toast]:!px-3 group-[.toast]:!font-semibold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
