import { type ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background">
      {/* Sidebar Toggle - integrated into header edge */}
      <div className="flex h-full items-center border-r px-2">
        <SidebarTrigger />
      </div>

      {/* Title and Actions */}
      <div className="flex flex-1 items-center justify-between px-4">
        <div>
          <h1 className="text-lg font-semibold leading-none">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>

        {(actions || children) && (
          <div className="flex items-center gap-2">{actions || children}</div>
        )}
      </div>
    </header>
  );
}
