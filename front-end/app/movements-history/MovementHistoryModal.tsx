import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, RefreshCcw } from 'lucide-react';

interface HistoryEntry {
  id: number;
  date: string;
  status: string;
  jobNumber?: string;
  remarks?: string;
  inventory?: { containerNumber: string };
  shipmentId: number | null;
  emptyRepoJobId: number | null;
  port?: { portName?: string };
  addressBook?: {
    addressName?: string;
    companyName?: string;
  };
  shipment?: {
    jobNumber?: string;
    vesselName?: string;
  };
  emptyRepoJob?: {
    jobNumber?: string;
    vesselName?: string;
  };
}


interface Props {
  containerNumber: string;
  onClose: () => void;
}

const MovementHistoryModal: React.FC<Props> = ({ containerNumber, onClose }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/movement-history`);
      const all = res.data || [];

      const filtered = all.filter(
        (entry: HistoryEntry) =>
          entry.inventory?.containerNumber?.toLowerCase() === containerNumber.toLowerCase()
      );

      setHistory(filtered);
    } catch (err) {
      console.error('Error fetching movement history:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (containerNumber) fetchHistory();
  }, [containerNumber]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-600">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Container {containerNumber} - Status History
              <span className="ml-3 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-neutral-700/80 px-3 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-neutral-600">
                {history.length} entries
              </span>
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-red-500 transition-colors duration-200 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Refresh Button */}
        <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-neutral-800 dark:to-neutral-700 border-b border-gray-200 dark:border-neutral-700">
          <button 
            onClick={fetchHistory} 
            className="text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center text-sm font-semibold transition-colors duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg"
          >
            <RefreshCcw size={16} className="mr-2" />
            Refresh History
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-blue-50 dark:from-neutral-800 dark:to-neutral-700 sticky top-0">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Date</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Job No.</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Location</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Remark</th>
              </tr>
            </thead>                                      
            <tbody className="bg-white dark:bg-neutral-900">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                      <span className="font-medium">Loading history...</span>
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400 text-lg">📋</span>
                      </div>
                      <span className="font-medium">No history found for this container.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((entry, index) => (
                  <tr 
                    key={entry.id} 
                    className={`border-b border-gray-100 dark:border-neutral-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors duration-150 ${
                      index % 2 === 0 ? 'bg-gray-50/70 dark:bg-neutral-800/70' : ''
                    }`}
                  >
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-100 font-semibold">
                      {new Date(entry.date).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    <td className="py-4 px-6 text-gray-700 dark:text-gray-300 font-medium">
                      {entry.shipment?.jobNumber || entry.emptyRepoJob?.jobNumber || entry.jobNumber || 'NA'}
                    </td>

                    <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                      {entry.addressBook?.companyName && entry.port?.portName
                        ? `${entry.addressBook.companyName} - ${entry.port.portName}`
                        : entry.addressBook?.companyName || entry.port?.portName || 'Unknown'}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold shadow-sm ${
                          entry.status === 'ALLOTTED'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200'
                            : entry.status === 'AVAILABLE'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-200'
                              : entry.status?.toLowerCase().includes('empty')
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200'
                                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-200'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    
                    <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                      {entry.remarks || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-neutral-800 dark:to-neutral-700 border-t border-gray-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 dark:from-neutral-700 dark:to-neutral-600 dark:hover:from-neutral-600 dark:hover:to-neutral-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl cursor-pointer"
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovementHistoryModal;
