import { Shell } from "@/components/spendwise/shell";
import {
  Camera,
  FileSpreadsheet,
  Landmark,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

const importOptions: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Camera,
    title: "Scan Receipt",
    description:
      "Photograph or upload a receipt and let AI extract the details.",
  },
  {
    icon: Landmark,
    title: "Bank Statement",
    description:
      "Import CSV or supported PDF bank statements with duplicate detection.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV Import",
    description:
      "Use the classic SpendWise CSV format for bulk expense imports.",
  },
];

export default function Page() {
  return (
    <Shell
      title="Import"
      subtitle="Bring financial data into SpendWise without tedious typing."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {importOptions.map(({ icon: Icon, title, description }) => (
          <button
            key={title}
            className="sw-card p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Icon size={30} className="sw-brand" />
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 sw-muted">{description}</p>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold sw-brand">
              <UploadCloud size={16} />
              Choose file
            </div>
          </button>
        ))}
      </div>
      <div className="sw-card mt-5 p-5">
        <h2 className="font-bold">Recent Imports</h2>
        <div className="mt-4 text-sm sw-muted">
          No v2 imports yet. Your future statement and receipt imports will
          appear here.
        </div>
      </div>
    </Shell>
  );
}
