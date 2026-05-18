type Props = { onResume: () => void; onAbort: () => void };

export default function ResumeModal({ onResume, onAbort }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full space-y-4">
        <h3 className="text-xl font-bold">Resume your flight?</h3>
        <p className="text-slate-600 text-sm">A flight was in progress when you left. Continue or discard?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onAbort} className="px-4 py-2 text-slate-500">Discard</button>
          <button onClick={onResume} className="bg-orange-500 text-white px-6 py-2 rounded-lg">Resume</button>
        </div>
      </div>
    </div>
  );
}
