import Skeleton from "@/components/Skeleton";
import { Plus, RefreshCw } from "lucide-react";

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <div className="flex gap-3">
          <button 
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-300"
          >
            <RefreshCw size={16} />
            Refresh Sync
          </button>
          <button 
            disabled
            className="flex items-center gap-2 bg-gray-100 text-gray-300 px-5 py-2.5 rounded-xl font-bold"
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Event / Client</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Time</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...Array(5)].map((_, idx) => (
              <tr key={idx}>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <Skeleton className="w-9 h-9 rounded-lg" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
