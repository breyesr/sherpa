import Skeleton from "@/components/Skeleton";
import { UserPlus, Search } from "lucide-react";

export default function CRMLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
        <button 
          disabled
          className="flex items-center gap-2 bg-gray-100 text-gray-400 px-5 py-2.5 rounded-xl font-bold"
        >
          <UserPlus size={18} />
          Add Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <div className="w-full h-[58px] bg-white border border-gray-100 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-50 shadow-sm space-y-4">
            <Skeleton className="h-7 w-3/4 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="pt-4 border-t">
              <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
