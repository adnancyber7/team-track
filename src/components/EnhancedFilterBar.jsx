import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Filter,
  X,
  Search,
  SortAsc,
  SortDesc,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Save,
  FolderOpen,
  Trash2,
  Zap
} from "lucide-react";
import { toast } from "sonner";

export default function EnhancedFilterBar({
  columns = [],
  agents = [],
  regions = [],
  onApply,
  onClear,
  initial = null,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  onLoadFilter
}) {
  const [expanded, setExpanded] = useState(true);
  const [dateFrom, setDateFrom] = useState(initial?.dateFrom || "");
  const [dateTo, setDateTo] = useState(initial?.dateTo || "");
  const [statuses, setStatuses] = useState(initial?.statuses || {
    pending: false,
    done: false,
    rejected: false
  });
  const [searchText, setSearchText] = useState(initial?.searchText || "");
  const [selectedAgent, setSelectedAgent] = useState(initial?.selectedAgent || "");
  const [selectedRegion, setSelectedRegion] = useState(initial?.selectedRegion || "");
  const [awbSearch, setAwbSearch] = useState(initial?.awbSearch || "");
  const [sort1, setSort1] = useState(initial?.sort1 || { column: "", direction: "desc" });
  const [sort2, setSort2] = useState(initial?.sort2 || { column: "", direction: "desc" });
  const [filterName, setFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (statuses.pending || statuses.done || statuses.rejected) count++;
    if (searchText) count++;
    if (selectedAgent) count++;
    if (selectedRegion) count++;
    if (awbSearch) count++;
    if (sort1.column) count++;
    if (sort2.column) count++;
    return count;
  }, [dateFrom, dateTo, statuses, searchText, selectedAgent, selectedRegion, awbSearch, sort1, sort2]);

  const toggleStatus = useCallback((key) => {
    setStatuses((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const applyQuickFilter = useCallback((preset) => {
    const today = new Date().toISOString().split('T')[0];

    switch(preset) {
      case 'today':
        setDateFrom(today);
        setDateTo(today);
        break;
      case 'pending':
        setStatuses({ pending: true, done: false, rejected: false });
        break;
      case 'done':
        setStatuses({ pending: false, done: true, rejected: false });
        break;
      case 'rejected':
        setStatuses({ pending: false, done: false, rejected: true });
        break;
      case 'all-status':
        setStatuses({ pending: true, done: true, rejected: true });
        break;
    }
    toast.success(`Quick filter: ${preset}`);
  }, []);

  const apply = useCallback(() => {
    const sortColumns = [];
    if (sort1.column) sortColumns.push({ column: sort1.column, direction: sort1.direction });
    if (sort2.column) sortColumns.push({ column: sort2.column, direction: sort2.direction });

    onApply?.({
      dateFrom,
      dateTo,
      statuses,
      searchText,
      selectedAgent,
      selectedRegion,
      awbSearch,
      sortColumns
    });
    toast.success('Filters applied');
  }, [dateFrom, dateTo, statuses, searchText, selectedAgent, selectedRegion, awbSearch, sort1, sort2, onApply]);

  const clear = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setStatuses({ pending: false, done: false, rejected: false });
    setSearchText("");
    setSelectedAgent("");
    setSelectedRegion("");
    setAwbSearch("");
    setSort1({ column: "", direction: "desc" });
    setSort2({ column: "", direction: "desc" });
    onClear?.();
    toast.success('Filters cleared');
  }, [onClear]);

  const saveCurrentFilter = useCallback(() => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    const filter = {
      name: filterName,
      dateFrom,
      dateTo,
      statuses,
      searchText,
      selectedAgent,
      selectedRegion,
      awbSearch,
      sort1,
      sort2,
      timestamp: new Date().toISOString()
    };

    onSaveFilter?.(filter);
    setFilterName("");
    setShowSaveDialog(false);
    toast.success(`Filter "${filter.name}" saved`);
  }, [filterName, dateFrom, dateTo, statuses, searchText, selectedAgent, selectedRegion, awbSearch, sort1, sort2, onSaveFilter]);

  const loadFilter = useCallback((filter) => {
    setDateFrom(filter.dateFrom || "");
    setDateTo(filter.dateTo || "");
    setStatuses(filter.statuses || { pending: false, done: false, rejected: false });
    setSearchText(filter.searchText || "");
    setSelectedAgent(filter.selectedAgent || "");
    setSelectedRegion(filter.selectedRegion || "");
    setAwbSearch(filter.awbSearch || "");
    setSort1(filter.sort1 || { column: "", direction: "desc" });
    setSort2(filter.sort2 || { column: "", direction: "desc" });
    onLoadFilter?.(filter);
    toast.success(`Loaded filter: ${filter.name}`);
  }, [onLoadFilter]);

  const deleteFilter = useCallback((filter) => {
    onDeleteFilter?.(filter);
    toast.success(`Deleted filter: ${filter.name}`);
  }, [onDeleteFilter]);

  return (
    <Card className="w-full overflow-hidden border-2 border-yellow-400/20 shadow-lg">
      <motion.div
        initial={false}
        animate={{ backgroundColor: expanded ? "rgba(250, 204, 21, 0.05)" : "rgba(255, 255, 255, 0.9)" }}
        className="p-3 border-b border-yellow-400/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold text-sm px-3 py-1 shadow-md">
                <Filter className="w-4 h-4 mr-1.5" />
                Advanced Filters
              </Badge>
            </motion.div>

            {activeFilterCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-semibold">
                  {activeFilterCount} active
                </Badge>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </motion.div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {!expanded && activeFilterCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex flex-wrap gap-2"
            >
              {dateFrom && (
                <Badge variant="outline" className="text-xs">
                  From: {dateFrom}
                </Badge>
              )}
              {dateTo && (
                <Badge variant="outline" className="text-xs">
                  To: {dateTo}
                </Badge>
              )}
              {(statuses.pending || statuses.done || statuses.rejected) && (
                <Badge variant="outline" className="text-xs">
                  Status: {[statuses.pending && 'Pending', statuses.done && 'Done', statuses.rejected && 'Rejected'].filter(Boolean).join(', ')}
                </Badge>
              )}
              {searchText && (
                <Badge variant="outline" className="text-xs">
                  Search: {searchText}
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-4 space-y-4 bg-gradient-to-br from-white to-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    Quick Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search in all columns..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-9 h-9 border-gray-300 focus:border-yellow-400 focus:ring-yellow-400"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    AWB Search
                  </Label>
                  <Input
                    placeholder="Search AWB number..."
                    value={awbSearch}
                    onChange={(e) => setAwbSearch(e.target.value)}
                    className="h-9 border-gray-300 focus:border-yellow-400 focus:ring-yellow-400"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Agent Filter
                  </Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="h-9 border-gray-300">
                      <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              </div>

              <Separator className="bg-yellow-400/20" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Date Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="pl-9 h-9 border-gray-300 focus:border-yellow-400"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="pl-9 h-9 border-gray-300 focus:border-yellow-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyQuickFilter('today')}
                      className="flex-1 h-7 text-xs"
                    >
                      Today
                    </Button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Status Filter
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="button"
                        variant={statuses.pending ? "default" : "outline"}
                        className={`w-full h-9 text-xs ${statuses.pending ? 'bg-yellow-500 hover:bg-yellow-600 text-black font-semibold' : ''}`}
                        onClick={() => toggleStatus("pending")}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Pending
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="button"
                        variant={statuses.done ? "default" : "outline"}
                        className={`w-full h-9 text-xs ${statuses.done ? 'bg-green-500 hover:bg-green-600 text-white font-semibold' : ''}`}
                        onClick={() => toggleStatus("done")}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Done
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="button"
                        variant={statuses.rejected ? "default" : "outline"}
                        className={`w-full h-9 text-xs ${statuses.rejected ? 'bg-red-500 hover:bg-red-600 text-white font-semibold' : ''}`}
                        onClick={() => toggleStatus("rejected")}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Rejected
                      </Button>
                    </motion.div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyQuickFilter('all-status')}
                    className="w-full h-7 text-xs"
                  >
                    Select All Status
                  </Button>
                </motion.div>
              </div>

              {regions && regions.length > 0 && (
                <>
                  <Separator className="bg-yellow-400/20" />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="space-y-2"
                  >
                    <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Region Filter
                    </Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger className="h-9 border-gray-300">
                        <SelectValue placeholder="All Regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                </>
              )}

              <Separator className="bg-yellow-400/20" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-semibold text-gray-700">Primary Sort</Label>
                  <div className="grid grid-cols-[1fr,auto] gap-2">
                    <Select value={sort1.column} onValueChange={(v) => setSort1((s) => ({ ...s, column: v }))}>
                      <SelectTrigger className="h-9 border-gray-300">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {columns.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sort1.direction} onValueChange={(v) => setSort1((s) => ({ ...s, direction: v }))}>
                      <SelectTrigger className="h-9 w-[100px] border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">
                          <div className="flex items-center">
                            <SortAsc className="w-3.5 h-3.5 mr-1.5" />
                            Asc
                          </div>
                        </SelectItem>
                        <SelectItem value="desc">
                          <div className="flex items-center">
                            <SortDesc className="w-3.5 h-3.5 mr-1.5" />
                            Desc
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-semibold text-gray-700">Secondary Sort</Label>
                  <div className="grid grid-cols-[1fr,auto] gap-2">
                    <Select value={sort2.column} onValueChange={(v) => setSort2((s) => ({ ...s, column: v }))}>
                      <SelectTrigger className="h-9 border-gray-300">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {columns.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sort2.direction} onValueChange={(v) => setSort2((s) => ({ ...s, direction: v }))}>
                      <SelectTrigger className="h-9 w-[100px] border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">
                          <div className="flex items-center">
                            <SortAsc className="w-3.5 h-3.5 mr-1.5" />
                            Asc
                          </div>
                        </SelectItem>
                        <SelectItem value="desc">
                          <div className="flex items-center">
                            <SortDesc className="w-3.5 h-3.5 mr-1.5" />
                            Desc
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              </div>

              {savedFilters && savedFilters.length > 0 && (
                <>
                  <Separator className="bg-yellow-400/20" />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                  >
                    <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5" />
                      Saved Filters
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {savedFilters.map((filter, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + idx * 0.05 }}
                        >
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-yellow-50 transition-colors pr-1 flex items-center gap-1"
                          >
                            <span onClick={() => loadFilter(filter)}>{filter.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-red-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFilter(filter);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}

              <Separator className="bg-yellow-400/20" />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 flex-1">
                  {!showSaveDialog ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="h-9"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      Save Filter
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        placeholder="Filter name..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="h-9 flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && saveCurrentFilter()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveCurrentFilter}
                        className="h-9 bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowSaveDialog(false);
                          setFilterName("");
                        }}
                        className="h-9"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clear}
                      className="h-9 px-4 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Clear
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="button"
                      onClick={apply}
                      className="h-9 px-6 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold shadow-md"
                    >
                      <Zap className="w-4 h-4 mr-1.5" />
                      Apply Filters
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
