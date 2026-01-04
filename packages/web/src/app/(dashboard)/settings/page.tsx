import { PageHeader } from "@/shared/layout";
import { SummarySettingsForm } from "@/features/settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Settings"
        description="Configure application settings"
      />

      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl">
          <SummarySettingsForm />
        </div>
      </main>
    </div>
  );
}
