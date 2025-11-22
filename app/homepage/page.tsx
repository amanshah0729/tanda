"use client"

import { GroupTableRow } from "@/components/group-table-row"

export default function HomePage() {
  // Sample data - replace with actual data from your backend
  const groups = [
    { id: 1, name: "Family Savings", numberOfPeople: 5 },
    { id: 2, name: "Vacation Fund", numberOfPeople: 8 },
    { id: 3, name: "Emergency Fund", numberOfPeople: 3 },
  ]

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <header className="w-full border-b border-gray-800 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Handle Start Group
                  console.log('Start Group clicked')
                }}
                className="py-2 px-4 bg-[#ff1493] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Group
              </button>
              <button
                onClick={() => {
                  // Handle Join Group
                  console.log('Join Group clicked')
                }}
                className="py-2 px-4 bg-[#ff1493] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                Join Group
              </button>
            </div>
          </div>
        </header>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-white/70 font-semibold text-sm">Group Name</th>
                <th className="text-left py-3 px-4 text-white/70 font-semibold text-sm">Members</th>
                <th className="text-right py-3 px-4 text-white/70 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <GroupTableRow
                  key={group.id}
                  groupName={group.name}
                  numberOfPeople={group.numberOfPeople}
                  onButtonClick={() => {
                    console.log(`View group: ${group.name}`)
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

