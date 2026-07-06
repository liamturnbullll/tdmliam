import { PoundSterling, Users, FileSpreadsheet, Send } from 'lucide-react';

/* ============================================================
   TDM PAYROLL HUB — scaffold. Auth + shell are wired up; the
   Notion import, pay preview, and Wise trigger land next.
   ============================================================ */

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: 'Import the Notion export',
    body: 'Pull the biweekly "Cautious Payroll" roster (name, role, hours worked, actual rate, deductions).'
  },
  {
    icon: Users,
    title: 'Review pay per person',
    body: 'Net pay = hours worked × actual rate − deductions. Flag anyone missing a rate or a Wise recipient.'
  },
  {
    icon: Send,
    title: 'Hand off to Wise',
    body: 'Trigger the batch run in payroll/, with a human confirming the total before anything is funded.'
  }
];

export default function App() {
  return (
    <div
      className="min-h-screen bg-[#4C5C4A] text-[#F5F5F0] p-6"
      style={{ fontFamily: '"Montserrat", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
            <PoundSterling size={20} className="text-[#2A362A]" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-lg">TDM Payroll Hub</div>
            <div className="text-xs text-[#96A093]">Biweekly contractor payroll, end to end</div>
          </div>
        </div>

        <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-6 mb-6">
          <div className="text-sm text-[#96A093] mb-1">Status</div>
          <div className="text-base">Nothing wired up yet — this is the login + shell.</div>
        </div>

        <div className="space-y-3">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-5">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#4C5C4A] border border-[#3D4A3B] flex items-center justify-center">
                <Icon size={16} className="text-amber-400" />
              </div>
              <div>
                <div className="font-medium text-sm mb-1">{title}</div>
                <div className="text-sm text-[#96A093]">{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
