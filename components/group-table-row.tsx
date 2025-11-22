interface GroupTableRowProps {
  groupName: string
  numberOfPeople: number
  onButtonClick?: () => void
}

export function GroupTableRow({ groupName, numberOfPeople, onButtonClick }: GroupTableRowProps) {
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors">
      <td className="py-4 px-4 text-white font-medium">{groupName}</td>
      <td className="py-4 px-4 text-white/70">{numberOfPeople} {numberOfPeople === 1 ? 'person' : 'people'}</td>
      <td className="py-4 px-4 text-right">
        <button
          onClick={onButtonClick}
          className="py-2 px-4 bg-[#ff1493] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
        >
          View
        </button>
      </td>
    </tr>
  )
}

