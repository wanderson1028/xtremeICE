import React from "react";

// IaaS / PaaS / SaaS responsibility split — the boundary shifts from customer
// to provider as you move right. A frequently-missed CLF-002 concept.
const MODELS = [
  {
    name: "IaaS",
    example: "EC2, VPC",
    customerManages: ["OS", "Apps", "Data", "Patching"],
    providerManages: ["Hardware", "Network", "Virtualization"],
  },
  {
    name: "PaaS",
    example: "RDS, Beanstalk",
    customerManages: ["Apps", "Data"],
    providerManages: ["OS", "Engine", "Patching", "Hardware"],
  },
  {
    name: "SaaS",
    example: "Chime, WorkMail",
    customerManages: ["Data"],
    providerManages: ["Apps", "OS", "Engine", "Hardware"],
  },
];

export default function ServiceModelBar() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-[10px] font-mono">
        <span className="flex items-center gap-1.5 text-gray-400"><span className="h-3 w-3 rounded-sm bg-gray-600" /> AWS manages</span>
        <span className="flex items-center gap-1.5 text-blue-300"><span className="h-3 w-3 rounded-sm bg-blue-600" /> Customer manages</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODELS.map(m => {
          const total = m.customerManages.length + m.providerManages.length;
          const customerPct = (m.customerManages.length / total) * 100;
          return (
            <div key={m.name} className="bg-black/40 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-bold text-white">{m.name}</span>
                <span className="text-[10px] font-mono text-gray-500">{m.example}</span>
              </div>
              <div className="flex h-4 rounded-md overflow-hidden mb-2 border border-gray-800">
                <div className="bg-gray-600" style={{ width: `${100 - customerPct}%` }} />
                <div className="bg-blue-600" style={{ width: `${customerPct}%` }} />
              </div>
              <div className="text-[10px] font-mono text-gray-400 space-y-0.5">
                <div><span className="text-gray-500">AWS:</span> {m.providerManages.join(", ")}</div>
                <div><span className="text-blue-400">You:</span> {m.customerManages.join(", ")}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] font-mono text-gray-500 text-center">Responsibility shifts left → right: customer burden decreases from IaaS to SaaS</p>
    </div>
  );
}