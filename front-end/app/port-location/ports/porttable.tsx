"use client";

import React, { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import axios from "axios";
import AddPortForm from "./AddPortForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Port {
  containerCapacity: string;
  containerClass: string;
  id: number;
  portType: string;
  portCode: string;
  portName: string;
  portLongName: string;
  status: string;
  country: { countryName: string };
  currency: { currencyName: string };
}

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-block px-4 py-1 rounded-full text-xs font-semibold shadow transition-all duration-300 hover:scale-105",
      status === "Active"
        ? "bg-green-900/80 text-green-300"
        : "bg-red-900/80 text-red-300"
    )}
    style={{
      minWidth: 70,
      textAlign: "center",
      letterSpacing: 1,
    }}
  >
    {status}
  </span>
);

const PortTable = () => {
  const [ports, setPorts] = useState<Port[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const fetchPorts = async () => {
    try {
      const res = await axios.get("http://localhost:8000/ports");
      setPorts(res.data);
    } catch (error) {
      console.error("Error fetching ports:", error);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const filteredPorts = ports.filter((port) =>
    port.portName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  port.portCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
  port.portType.toLowerCase().includes(searchTerm.toLowerCase()) ||
  port.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
  port.country?.countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  port.currency?.currencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  port.portLongName.toLowerCase().includes(searchTerm.toLowerCase())

  );

  const handleEditClick = async (id: number) => {
    try {
      const res = await axios.get(`http://localhost:8000/ports/${id}`);
      setEditData(res.data);
      setShowForm(true);
    } catch (err) {
      console.error("Failed to fetch port", err);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this port?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:8000/ports/${id}`);
      fetchPorts();
    } catch (err: any) {
      alert(
        "Failed to delete port: " + (err.response?.data?.message || err.message)
      );
    }
  };

  return (
    <div className="px-4 pt-4 pb-4 dark:bg-black">
      <div className="flex items-center justify-between mt-0 mb-4">
        <div className="relative w-full mr-4">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            placeholder="Search ports..."
            className="h-8 p-2 pl-10 rounded-lg bg-background text-foreground placeholder-muted-foreground border border-border focus:outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium py-2 px-6 shadow rounded-md whitespace-nowrap cursor-pointer"
          onClick={() => {
            setEditData(null);
            setShowForm(true);
          }}
        >
          <Plus size={16} className="mr-2" />
          Add Port
        </Button>
      </div>

      <div className="rounded-lg shadow border border-border bg-background overflow-x-auto">
        <Table>
        <TableHeader className="bg-background">
            <TableRow>
              <TableHead className="text-center text-foreground">Port Type</TableHead>
              <TableHead className="text-center text-foreground">Port Code</TableHead>
              <TableHead className="text-center text-foreground">Port Name</TableHead>
              <TableHead className="text-center text-foreground">Port Long Name</TableHead>
              <TableHead className="text-center text-foreground">Country</TableHead>
              <TableHead className="text-center text-foreground">Currency</TableHead>
              <TableHead className="text-center text-foreground">Status</TableHead>
              <TableHead className="text-center text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPorts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground bg-background">
                  No ports found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPorts.map((port) => (
                <TableRow
                  key={port.id}
                  className="text-foreground bg-background hover:bg-muted transition border-b border-border"
                >
                  <TableCell className="text-center">{port.portType}</TableCell>
                  <TableCell className="text-center">{port.portCode}</TableCell>
                  <TableCell className="text-center">{port.portName}</TableCell>
                  <TableCell className="text-center">{port.portLongName}</TableCell>
                  <TableCell className="text-center">
                    {port.country?.countryName || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {port.currency?.currencyName || "-"}
                  </TableCell>
                  <TableCell className="text-center ">
                    <StatusBadge status={port.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => handleEditClick(port.id)}
                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 cursor-pointer dark:hover:bg-blue-900/40"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => handleDelete(port.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/40 cursor-pointer dark:hover:bg-red-900/40"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showForm && (
        <AddPortForm
          onClose={() => {
            setShowForm(false);
            setEditData(null);
            fetchPorts();
          }}
          editData={editData}
          isEditMode={!!editData}
        />
      )}
    </div>
  );
};

export default PortTable;
