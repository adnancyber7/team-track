import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar, Filter, SortAsc, SortDesc } from "lucide-react";

export default function FilterBar({ columns = [], onApply, onClear, initial = null, compact = false }) {
  const [dateFrom, setDateFrom] = useState(initial?.dateFrom || "");
  const [dateTo, setDateTo] = useState(initial?.dateTo || "");
  const [statuses, setStatuses] = useState(initial?.statuses || { pending: true, done: false, rejected: false });
  const [sort1, setSort1] = useState(initial?.sort1 || { column: "", direction: "asc" });
  const [sort2, setSort2] = useState(initial?.sort2 || { column: "", direction: "asc" });

  const toggleStatus = (key) => setStatuses((s) => ({ ...s, [key]: !s[key] }));

  const apply = () => {
    const sortColumns = [];
    if (sort1.column) sortColumns.push({ column: sort1.column, direction: sort1.direction });
    if (sort2.column) sortColumns.push({ column: sort2.column, direction: sort2.direction });
    onApply?.({ dateFrom, dateTo, statuses, sortColumns });
  };

  const clear = () => {
    setDateFrom("");
    setDateTo("");
    setStatuses({ pending: true, done: false, rejected: false });
    setSort1({ column: "", direction: "asc" });
    setSort2({ column: "", direction: "asc" });
    onClear?.();
  };

  return (
    <div className={`w-full ${compact ? "p-2" : "p-3"} rounded-lg border bg-white/90 flex flex-wrap items-end gap-2`}>
      <div className="flex items-center gap-2">
        <Badge className="bg-yellow-400 text-black font-bold"><Filter className="w-3 h-3 mr-1" /> Filters</Badge>
      </div>

      <div className="flex flex-col">
        <Label className="text-xs">From</Label>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8" />
        </div>
      </div>

      <div className="flex flex-col">
        <Label className="text-xs">To</Label>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Status</Label>
        <div className="flex items-center gap-2">
          <Button type="button" variant={statuses.pending ? "default" : "outline"} className="h-8" onClick={() => toggleStatus("pending")}>Pending</Button>
          <Button type="button" variant={statuses.done ? "default" : "outline"} className="h-8" onClick={() => toggleStatus("done")}>Done</Button>
          <Button type="button" variant={statuses.rejected ? "default" : "outline"} className="h-8" onClick={() => toggleStatus("rejected")}>Rejected</Button>
        </div>
      </div>

      <div className="flex flex-col">
        <Label className="text-xs">Sort 1</Label>
        <div className="flex items-center gap-2">
          <Select value={sort1.column} onValueChange={(v) => setSort1((s) => ({ ...s, column: v }))}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Column" /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort1.direction} onValueChange={(v) => setSort1((s) => ({ ...s, direction: v }))}>
            <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="asc"><SortAsc className="w-3 h-3 mr-1" /> Asc</SelectItem>
              <SelectItem value="desc"><SortDesc className="w-3 h-3 mr-1" /> Desc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col">
        <Label className="text-xs">Sort 2</Label>
        <div className="flex items-center gap-2">
          <Select value={sort2.column} onValueChange={(v) => setSort2((s) => ({ ...s, column: v }))}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Column" /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort2.direction} onValueChange={(v) => setSort2((s) => ({ ...s, direction: v }))}>
            <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="asc"><SortAsc className="w-3 h-3 mr-1" /> Asc</SelectItem>
              <SelectItem value="desc"><SortDesc className="w-3 h-3 mr-1" /> Desc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button type="button" variant="outline" className="h-8" onClick={clear}>Clear</Button>
        <Button type="button" className="h-8 bg-yellow-400 hover:bg-yellow-500 text-black font-bold" onClick={apply}>Apply</Button>
      </div>
    </div>
  );
}