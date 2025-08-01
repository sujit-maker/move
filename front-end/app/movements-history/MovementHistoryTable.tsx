"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit } from "react-icons/fa";
import { Filter, HistoryIcon } from 'lucide-react';
import MovementHistoryModal from "./MovementHistoryModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface MovementRow {
  id: number;
  date: string;
  status: string;
  remarks: string;
  jobNumber?: string;
  vesselName?: string;
  inventory?: { containerNumber?: string };
  shipment?: { jobNumber?: string; vesselName?: string };
  emptyRepoJob?: { jobNumber?: string; vesselName?: string };
  port?: { id?: number; portName?: string };
  addressBook?: { id?: number; companyName?: string };
}

type Port = {
  id: number;
  portName: string;
};

type AddressBook = {
  id: number;
  companyName: string;
  businessType: string;
  portId: number;
};




const MovementHistoryTable = () => {
  const [data, setData] = useState<MovementRow[]>([]);
  const [containerSearch, setContainerSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [availableStatusOptions, setAvailableStatusOptions] = useState<string[]>([]);
  const [jobNumberForUpdate, setJobNumberForUpdate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [movementDate, setMovementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MovementRow | null>(null);
  const [editDate, setEditDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [portFilter, setPortFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState({ status: "", port: "", location: "" });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedContainerNumber, setSelectedContainerNumber] = useState<string | null>(null);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [depots, setDepots] = useState<AddressBook[]>([]);
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const [selectedDepotId, setSelectedDepotId] = useState<number | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState<number | null>(null);
  const [carriers, setCarriers] = useState<any[]>([]);


  const statusTransitions: Record<string, string[]> = {
    ALLOTTED: ["EMPTY PICKED UP"],
    "EMPTY PICKED UP": ["LADEN GATE-IN", "DAMAGED", "CANCELLED"],
    "LADEN GATE-IN": ["SOB"],
    SOB: ["LADEN GATE-OUT"],
    "LADEN GATE-OUT": ["EMPTY RETURNED","DAMAGED"],
    "EMPTY RETURNED": ["AVAILABLE", "UNAVAILABLE"],
    AVAILABLE: ["UNAVAILABLE"],
    UNAVAILABLE: ["AVAILABLE"],
    DAMAGED: ["RETURNED TO DEPOT"],
    CANCELLED: ["RETURNED TO DEPOT"],
    "RETURNED TO DEPOT": ["UNAVAILABLE", "AVAILABLE"],
  };


  // Fetch ports on load
  useEffect(() => {
    axios.get("http://localhost:8000/ports").then((res) => {
      setPorts(res.data || []);
    });
  }, []);

  // Fetch depots when a port is selected
  useEffect(() => {
    if (selectedPortId !== null) {
      axios.get("http://localhost:8000/addressbook").then((res) => {
        const filtered = res.data.filter((entry: any) => {
          return (
            entry.businessType?.includes("Depot Terminal") &&
            entry.businessPorts.some((bp: any) => bp.portId === selectedPortId)
          );
        });

        setDepots(filtered);
      });
    }
  }, [selectedPortId]);

  useEffect(() => {
    if (newStatus === "SOB") {
      axios.get("http://localhost:8000/addressbook").then((res) => {
        const filteredCarriers = res.data.filter((entry: any) => {
          const types = entry.businessType?.split(",").map((t: string) => t.trim()) || [];
          return types.includes("Carrier");
        });
        setCarriers(filteredCarriers); // assume setCarriers is defined via useState
      });
    }
  }, [newStatus]);





  useEffect(() => {
    if (
      (newStatus === "DAMAGED" || newStatus === "CANCELLED" || newStatus === "RETURNED TO DEPOT") &&
      selectedIds.length > 0
    ) {
      const selectedRow = data.find((d) => selectedIds.includes(d.id));
      if (selectedRow) {
        setSelectedPortId(selectedRow.port?.id || null);
        setSelectedDepotId(selectedRow.addressBook?.id || null);
      }
    }
  }, [newStatus, selectedIds]);





  const openEditDateModal = (row: MovementRow) => {
    setEditingRow(row);
    setEditDate(row.date.slice(0, 10));
    setEditModalOpen(true);
  };

  const handleViewHistory = (containerNumber: string) => {
    setSelectedContainerNumber(containerNumber);
    setShowHistoryModal(true);
  };

  useEffect(() => {
    axios.get("http://localhost:8000/movement-history/latest").then((res) => {
      // Sort by date in descending order (latest first)
      const sortedData = res.data.sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setData(sortedData);
    });
    axios.get("http://localhost:8000/ports").then((res) => setPorts(res.data));
  }, []);

  const filteredData = data.filter((row) => {
    const containerMatch = row.inventory?.containerNumber?.toLowerCase().includes(containerSearch.toLowerCase());
    const jobMatch =
  row.shipment?.jobNumber?.toLowerCase().includes(jobSearch.toLowerCase()) ||
  row.emptyRepoJob?.jobNumber?.toLowerCase().includes(jobSearch.toLowerCase()) ||
  row.jobNumber?.toLowerCase().includes(jobSearch.toLowerCase());


    const statusMatch = !statusFilter || row.status === statusFilter;
    const portMatch = !portFilter || row.port?.portName === portFilter;
    const locationMatch = !locationFilter || row.addressBook?.companyName === locationFilter;
    return (!containerSearch || containerMatch) && (!jobSearch || jobMatch) && statusMatch && portMatch && locationMatch;
  });

  // Check if all filtered records have the same job number
  const getUniqueJobNumbers = () => {
    const jobNumbers = new Set<string>();
    filteredData.forEach(row => {
      const jobNumber = row.shipment?.jobNumber || row.emptyRepoJob?.jobNumber || row.jobNumber;
      if (jobNumber) jobNumbers.add(jobNumber);
    });
    return Array.from(jobNumbers);
  };

  const uniqueJobNumbers = getUniqueJobNumbers();
  const canSelectAll = uniqueJobNumbers.length === 1 && filteredData.length > 0;

  // Calculate status counts for all data (not just filtered)
  const getStatusCounts = () => {
    const statusCounts: Record<string, number> = {};

    // Define all possible statuses to ensure they appear even with 0 count
    const allStatuses = [
      'ALLOTTED', 'EMPTY PICKED UP', 'LADEN GATE-IN', 'SOB',
      'LADEN GATE-OUT', 'EMPTY RETURNED', 'AVAILABLE', 'UNAVAILABLE'
    ];

    // Initialize all statuses with 0
    allStatuses.forEach(status => {
      statusCounts[status] = 0;
    });

    // Count actual occurrences
    data.forEach(row => {
      const status = row.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return statusCounts;
  };

  const statusCounts = getStatusCounts();

  const handleSelectAll = () => {
    if (!canSelectAll) return;

    const jobNumber = uniqueJobNumbers[0];
    const recordsWithSameJob = filteredData.filter(row => {
      const rowJobNumber = row.shipment?.jobNumber || row.emptyRepoJob?.jobNumber || row.jobNumber;
      return rowJobNumber === jobNumber;
    });

    const recordIds = recordsWithSameJob.map(row => row.id);
    setSelectedIds(recordIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const toggleSelectRow = (row: MovementRow) => {
    const sameJob = data.find((d) => selectedIds.includes(d.id));
    const selectedJob = sameJob?.shipment?.jobNumber || sameJob?.emptyRepoJob?.jobNumber || sameJob?.jobNumber || "";
    const currentRowJob = row.shipment?.jobNumber || row.emptyRepoJob?.jobNumber || row.jobNumber;

    if (sameJob && selectedJob !== currentRowJob) {
      alert("Please select containers with the same Job Number (Shipping or Empty Repo).");
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
    );
  };

  const handleUpdateStatusClick = () => {
    const selectedRows = data.filter((row) => selectedIds.includes(row.id));
    const currentStatuses = [...new Set(selectedRows.map((r) => r.status))];

    if (currentStatuses.length !== 1) {
      alert("Selected containers must all have the same current status.");
      return;
    }

    const currentStatus = currentStatuses[0]?.toUpperCase();
    const jobNumber =
      selectedRows[0].shipment?.jobNumber || selectedRows[0].emptyRepoJob?.jobNumber || "" || selectedRows[0].jobNumber || "";

    setAvailableStatusOptions(statusTransitions[currentStatus] || []);
    setNewStatus("");
    setJobNumberForUpdate(jobNumber);
    setRemarks("");
    setModalOpen(true);
  };

  // Fetch locations by port
  const fetchLocationsByPort = async (portId: number) => {
    try {
      const res = await axios.get(`http://localhost:8000/addressbook/locations-by-port/${portId}`);
      setAvailableLocations(res.data);
    } catch (error) {
      console.error("Error fetching locations by port:", error);
      setAvailableLocations([]);
    }
  };

  // Handle port filter change
  const handlePortFilterChange = (portName: string) => {
    setTempFilters(prev => ({ ...prev, port: portName, location: "" }));

    if (portName) {
      const selectedPort = ports.find(p => p.portName === portName);
      if (selectedPort) {
        fetchLocationsByPort(selectedPort.id);
      }
    } else {
      setAvailableLocations([]);
    }
  };

  const handleBulkUpdate = async () => {
    if (!newStatus) {
      alert("Please select a new status.");
      return;
    }

    if ((newStatus === "DAMAGED" || newStatus === "CANCELLED") && remarks.trim() === "") {
    alert("Remarks are required when status is DAMAGED or CANCELLED.");
    return;
  }

    try {
      const shipmentRes = await axios.get("http://localhost:8000/shipment");
      const shipment = shipmentRes.data.find((s: any) => s.jobNumber === jobNumberForUpdate);

      let emptyRepoJob = null;
      if (!shipment) {
        const emptyRepoRes = await axios.get("http://localhost:8000/empty-repo-job");
        emptyRepoJob = emptyRepoRes.data.find((e: any) => e.jobNumber === jobNumberForUpdate);
      }

      const source = shipment || emptyRepoJob;

      let portId: number | undefined;
      let addressBookId: number | null | undefined;

      const newStatusUpper = newStatus.toUpperCase();

      switch (newStatusUpper) {
        case "EMPTY PICKED UP":
          break;

        case "LADEN GATE-IN":
          portId = source?.polPortId;
          addressBookId = null;
          break;

        case "SOB":
          portId = source?.podPortId || source?.polPortId;
          addressBookId = selectedCarrierId || source?.carrierAddressBookId || null;
          break;


        case "LADEN GATE-OUT":
          portId = source?.podPortId;
          addressBookId = null;
          break;

        case "EMPTY RETURNED":
          portId = source?.podPortId;
          addressBookId = source?.emptyReturnDepotAddressBookId;
          break;

        case "AVAILABLE":
        case "UNAVAILABLE":
          {
            const prev = data.find((d) => selectedIds.includes(d.id));
            if (prev) {
              portId = prev.port?.id;
              addressBookId = prev.addressBook?.id ?? null;
            }
          }
          break;

              case "DAMAGED":
case "CANCELLED":
case "RETURNED TO DEPOT":
  portId = selectedPortId !== null ? selectedPortId : undefined;
  addressBookId = selectedDepotId || null;
  break;

        default:
          alert("Invalid status transition.");
          return;
      }

      const payload: any = {
        ids: selectedIds,
        newStatus: newStatusUpper,
        jobNumber: jobNumberForUpdate,
        date: movementDate,
        remarks: remarks.trim(),
        portId: selectedPortId || null,
  addressBookId: selectedDepotId || null, 
  vesselName: newStatus === "SOB" ? vesselName : null,
      };

      if (portId !== undefined) payload.portId = portId;
      if (addressBookId !== undefined) payload.addressBookId = addressBookId;
      console.log("Payload being sent:", payload);

      await axios.post("http://localhost:8000/movement-history/bulk-create", payload);

      alert("Status updated.");
      setSelectedIds([]);
      setModalOpen(false);
      setSelectedCarrierId(null);
      setVesselName("");



      const res = await axios.get("http://localhost:8000/movement-history/latest");
      setData(res.data);
    } catch (err: any) {
      console.error("Update failed:", err?.response || err?.message || err);
      alert("Update failed. Check console for details.");
    }
  };


  const handleDateUpdate = async () => {
    if (!editingRow) return;

    try {
      await axios.patch(`http://localhost:8000/movement-history/${editingRow.id}`, {
        date: editDate,
      });

      alert("Date updated successfully.");
      setEditModalOpen(false);
      setEditingRow(null);

      const res = await axios.get("http://localhost:8000/movement-history/latest");
      setData(res.data);
    } catch (err: any) {
      console.error("Date update failed:", err);
      alert("Failed to update date.");
    }
  };

  return (
    <div className="p-6 my-0 bg-white dark:bg-neutral-950 text-gray-900 dark:text-white min-h-screen mb-6">


      {/* Status Count Display - Moved higher up to marked space */}
      <div className="mb-4">
        {/* Status Cards with Total Records at the start */}
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1">
          {/* Total Records Card - First position */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-blue-400 to-blue-500 
                         text-white rounded-md shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <span className="text-[10px] font-medium">Total:</span>
            <span className="text-xs font-bold">{data.length}</span>
          </div>

          {/* Status Cards - Much smaller height, wider width */}
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="rounded-md p-0.5 shadow-sm hover:shadow-md 
                          transition-all duration-300 transform hover:scale-105 cursor-pointer
                          bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-800/20 dark:to-blue-700/20 
                          border border-blue-200 dark:border-blue-600 hover:from-blue-100 hover:to-blue-200"
            >
              <div className="text-center">
                <div className="text-[10px] font-bold mb-0.5 text-blue-600 dark:text-blue-400">
                  {count}
                </div>
                <div className="text-[7px] font-medium uppercase tracking-wide leading-tight text-blue-500 dark:text-blue-300">
                  {status.replace(/\s+/g, '\n')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Input
          type="text"
          placeholder="Search Container No."
          value={containerSearch}
          onChange={(e) => setContainerSearch(e.target.value)}
          className="flex-1 min-w-[220px]"
        />
        <Input
          type="text"
          placeholder="Search Shipping Job No."
          value={jobSearch}
          onChange={(e) => setJobSearch(e.target.value)}
          className="flex-1 min-w-[220px]"
        />
        <Button
          onClick={() => {
            setTempFilters({ status: statusFilter, port: portFilter, location: locationFilter });
            if (portFilter) {
              const selectedPort = ports.find(p => p.portName === portFilter);
              if (selectedPort) {
                fetchLocationsByPort(selectedPort.id);
              }
            }
            setShowFilterModal(true);
          }}
          variant="outline"
          className="flex items-center gap-2 cursor-pointer"
        >
          <Filter className="h-4 w-4" />
          Filter
        </Button>
        <Button
          onClick={handleUpdateStatusClick}
          disabled={selectedIds.length === 0}
          className={`${selectedIds.length > 0
            ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl cursor-pointer'
            : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
            }`}
        >
          Update Status {selectedIds.length > 0 && `(${selectedIds.length})`}
        </Button>
      </div>


      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-20">
                    {canSelectAll ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1">
                          <Button
                            onClick={handleSelectAll}
                            disabled={selectedIds.length === filteredData.length && filteredData.length > 0}
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Select All"
                          >
                            Select All
                          </Button>
                          <Button
                            onClick={handleDeselectAll}
                            disabled={selectedIds.length === 0}
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Deselect All"
                          >
                            Clear
                          </Button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {selectedIds.length > 0 ? `${selectedIds.length}/${filteredData.length} selected` : `${filteredData.length} items`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select</span>
                    )}
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Container No</TableHead>
                  <TableHead>Job No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-center">History</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => (
                  <TableRow 
                    key={row.id} 
                    className={`hover:bg-muted/50 transition-colors ${
                      selectedIds.includes(row.id) ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onCheckedChange={() => toggleSelectRow(row)}
                        className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                    </TableCell>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{row.inventory?.containerNumber || "-"}</TableCell>
                    <TableCell>{row.shipment?.jobNumber || row.emptyRepoJob?.jobNumber || row.jobNumber}</TableCell>
                                         <TableCell>
                       <span
                         className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                           row.status === 'ALLOTTED'
                             ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                             : row.status === 'AVAILABLE'
                               ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                               : row.status === 'EMPTY PICKED UP'
                                 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                 : row.status === 'LADEN GATE-IN'
                                   ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                   : row.status === 'SOB'
                                     ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                                                         : row.status === 'LADEN GATE-OUT'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                       : row.status === 'EMPTY RETURNED'
                                         ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                                         : row.status === 'UNAVAILABLE'
                                           ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                           : row.status === 'DAMAGED'
                                             ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                             : row.status === 'CANCELLED'
                                               ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                               : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                         }`}
                       >
                         {row.status}
                       </span>
                     </TableCell>
                    <TableCell>{row.port?.portName || "-"}</TableCell>
                    <TableCell>
                      {row.status?.toUpperCase() === "SOB" ? (
                        row.addressBook?.companyName && row.vesselName ? (
                          `${row.addressBook.companyName} - ${row.vesselName}`
                        ) : row.addressBook?.companyName ? (
                          row.addressBook.companyName
                        ) : row.vesselName ? (
                          row.vesselName
                        ) : (
                          "-"
                        )
                      ) : row.addressBook?.companyName && row.port?.portName ? (
                        `${row.addressBook.companyName} - ${row.port.portName}`
                      ) : row.addressBook?.companyName ? (
                        row.addressBook.companyName
                      ) : row.port?.portName ? (
                        row.port.portName
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{row.remarks}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        onClick={() => handleViewHistory(row.inventory?.containerNumber || "")}
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                        title="View History"
                      >
                        <HistoryIcon size={16} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        onClick={() => openEditDateModal(row)}
                        variant="ghost"
                        size="sm"
                        className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 cursor-pointer"
                        title="Edit Date"
                      >
                        <FaEdit />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

                    {/* Bulk Status Modal */}
       {modalOpen && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-lg">
           <Card className="w-full max-w-md mx-4">
             <CardHeader className="pb-4">
               <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                 Bulk Update Container Status
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               {/* New Status Dropdown */}
               {(() => {
                 // Determine the current status for the modal (from selected rows)
                 const selectedRows = data.filter((row) => selectedIds.includes(row.id));
                 const currentStatus =
                   selectedRows.length > 0
                     ? selectedRows[0].status
                     : "";

                 return (
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Status</label>
                     <select
                       value={newStatus}
                       onChange={(e) => setNewStatus(e.target.value)}
                       className="w-full px-3 py-2 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                     >
                       <option value="">Select New Status</option>
                       {availableStatusOptions.map((status) => (
                         <option key={status} value={status}>
                           {status}
                         </option>
                       ))}
                     </select>
                   </div>
                 );
               })()}

               {/* Show if EMPTY RETURNED or RETURNED TO DEPOT */}
               {(newStatus === "EMPTY RETURNED" || newStatus === "RETURNED TO DEPOT") && (
                 <div className="space-y-4">
                   {/* Port Dropdown */}
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Port</label>
                     <select
                       value={selectedPortId || ""}
                       onChange={(e) => {
                         const portId = parseInt(e.target.value);
                         setSelectedPortId(portId);
                         setSelectedDepotId(null); // Reset depot
                       }}
                       className="w-full px-3 py-2 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                     >
                       <option value="">Select Port</option>
                       {ports.map((port) => (
                         <option key={port.id} value={port.id}>
                           {port.portName}
                         </option>
                       ))}
                     </select>
                   </div>

                   {/* Depot Dropdown */}
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Depot</label>
                     <select
                       value={selectedDepotId || ""}
                       onChange={(e) => setSelectedDepotId(parseInt(e.target.value))}
                       className="w-full px-3 py-2 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                       disabled={!selectedPortId}
                     >
                       <option value="">Select Depot</option>
                       {depots.map((depot) => (
                         <option key={depot.id} value={depot.id}>
                           {depot.companyName}
                         </option>
                       ))}
                     </select>
                   </div>
                 </div>
               )}

               {newStatus === "SOB" && (
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Carrier Name</label>
                     <select
                       value={selectedCarrierId || ""}
                       onChange={(e) => {
                         const value = e.target.value;
                         setSelectedCarrierId(value ? parseInt(value) : null);
                       }}
                       className="w-full px-3 py-2 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                     >
                       <option value="">Select Carrier</option>
                       {carriers.map((carrier) => (
                         <option key={carrier.id} value={carrier.id}>
                           {carrier.companyName}
                         </option>
                       ))}
                     </select>
                   </div>

                   <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vessel Name</label>
                     <Input
                       type="text"
                       value={vesselName}
                       onChange={(e) => setVesselName(e.target.value)}
                       placeholder="Enter vessel name"
                     />
                   </div>
                 </div>
               )}

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                 <Input
                   type="date"
                   value={movementDate}
                   onChange={(e) => setMovementDate(e.target.value)}
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                   Remarks {["DAMAGED", "CANCELLED"].includes(newStatus) && <span className="text-red-500">*</span>}
                 </label>
                 <textarea
                   value={remarks}
                   onChange={(e) => setRemarks(e.target.value)}
                   className="w-full px-3 py-2 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                   rows={3}
                   placeholder="Enter remarks"
                 />
               </div>
             </CardContent>
             <div className="px-6 pb-6 flex justify-end gap-3">
               <Button
                 onClick={() => setModalOpen(false)}
                 variant="outline"
                 className="border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
               >
                 Cancel
               </Button>
               <Button
                 onClick={handleBulkUpdate}
                 className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
               >
                 Confirm
               </Button>
             </div>
           </Card>
         </div>
       )}

             {/* Edit Date Modal */}
       {editModalOpen && editingRow && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-lg">
           <Card className="w-full max-w-md mx-4">
             <CardHeader className="pb-4">
               <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                 Edit Movement Date
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Container Number</label>
                 <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-md border border-gray-200 dark:border-neutral-600 font-medium">
                   {editingRow.inventory?.containerNumber || "-"}
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                 <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-md border border-gray-200 dark:border-neutral-600">
                   <span
                     className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                       editingRow.status === 'ALLOTTED'
                         ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                         : editingRow.status === 'AVAILABLE'
                           ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                           : editingRow.status === 'EMPTY PICKED UP'
                             ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                             : editingRow.status === 'LADEN GATE-IN'
                               ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                               : editingRow.status === 'SOB'
                                 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                                                   : editingRow.status === 'LADEN GATE-OUT'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                   : editingRow.status === 'EMPTY RETURNED'
                                     ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                                     : editingRow.status === 'UNAVAILABLE'
                                       ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                       : editingRow.status === 'DAMAGED'
                                         ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                         : editingRow.status === 'CANCELLED'
                                           ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                           : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                     }`}
                   >
                     {editingRow.status}
                   </span>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Date</label>
                 <Input
                   type="date"
                   value={editDate}
                   onChange={(e) => setEditDate(e.target.value)}
                 />
               </div>
             </CardContent>
             <div className="px-6 pb-6 flex justify-end gap-3">
               <Button
                 onClick={() => setEditModalOpen(false)}
                 variant="outline"
                 className="border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
               >
                 Cancel
               </Button>
               <Button
                 onClick={handleDateUpdate}
                 className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
               >
                 Save
               </Button>
             </div>
           </Card>
         </div>
       )}

      {showFilterModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-lg w-full max-w-md border border-gray-300 dark:border-neutral-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Filter Movements</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-neutral-300 mb-2">Status</label>
                <select
                  value={tempFilters.status}
                  onChange={e => setTempFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-700 text-black dark:text-white rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Status</option>
                  {[...new Set(data.map(row => row.status))].filter(Boolean).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-neutral-300 mb-2">Port</label>
                <select
                  value={tempFilters.port}
                  onChange={e => handlePortFilterChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-700 text-black dark:text-white rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Ports</option>
                  {ports.map(port => (
                    <option key={port.id} value={port.portName}>{port.portName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-neutral-300 mb-2">Location</label>
                <select
                  value={tempFilters.location}
                  onChange={e => setTempFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-700 text-black dark:text-white rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
                  disabled={!tempFilters.port}
                >
                  <option value="">{tempFilters.port ? "All Locations" : "Select a port first"}</option>
                  {availableLocations.map(loc => (
                    <option key={loc.id} value={loc.companyName}>{loc.companyName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setTempFilters({ status: "", port: "", location: "" });
                  setStatusFilter("");
                  setPortFilter("");
                  setLocationFilter("");
                  setAvailableLocations([]);
                  setShowFilterModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setStatusFilter(tempFilters.status);
                  setPortFilter(tempFilters.port);
                  setLocationFilter(tempFilters.location);
                  setShowFilterModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedContainerNumber && (
        <MovementHistoryModal
          containerNumber={selectedContainerNumber}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};

export default MovementHistoryTable;
