import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Save, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";

const AdvancedFilterPanel = ({ onApplyFilters, savedFilters, onSaveFilter, onDeleteFilter, onLoadFilter }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [remarkKeyword, setRemarkKeyword] = useState("");
  const [reasonKeyword, setReasonKeyword] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [sortColumns, setSortColumns] = useState([{ column: null, direction: 'asc' }]);

  const columns = [
    { value: 'STATUS', label: 'Status' },
    { value: 'LINE', label: 'Line' },
    { value: 'TIME', label: 'Time' },
    { value: 'LOT', label: 'Lot' },
    { value: 'REMARKS', label: 'Remarks' },
    { value: 'AGENTS', label: 'Agents' },
    { value: "AWB'S", label: "AWB's" },
    { value: 'REASON', label: 'Reason' },
    { value: 'REGION', label: 'Region' }
  ];

  const handleApply = () => {
    const filters = {
      remarkKeyword,
      reasonKeyword,
      timeFrom: timeFrom ? parseTimeToMs(timeFrom) : null,
      timeTo: timeTo ? parseTimeToMs(timeTo) : null,
      sortColumns: sortColumns.filter(s => s.column)
    };
    onApplyFilters(filters);
    toast.success('Filters applied');
  };

  const handleClear = () => {
    setRemarkKeyword("");
    setReasonKeyword("");
    setTimeFrom("");
    setTimeTo("");
    setSortColumns([{ column: null, direction: 'asc' }]);
    onApplyFilters({
      remarkKeyword: "",
      reasonKeyword: "",
      timeFrom: null,
      timeTo: null,
      sortColumns: []
    });
    toast.success('Filters cleared');
  };

  const handleSave = () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }
    const filters = {
      name: filterName,
      remarkKeyword,
      reasonKeyword,
      timeFrom,
      timeTo,
      sortColumns
    };
    onSaveFilter(filters);
    setFilterName("");
    toast.success(`Filter "${filters.name}" saved`);
  };

  const handleLoad = (filter) => {
    setRemarkKeyword(filter.remarkKeyword || "");
    setReasonKeyword(filter.reasonKeyword || "");
    setTimeFrom(filter.timeFrom || "");
    setTimeTo(filter.timeTo || "");
    setSortColumns(filter.sortColumns || [{ column: null, direction: 'asc' }]);
    handleApply();
    toast.success(`Loaded filter "${filter.name}"`);
  };

  const parseTimeToMs = (timeStr) => {
    const parts = timeStr.split(':').map(p => parseInt(p) || 0);
    return ((parts[0] || 0) * 3600000) + ((parts[1] || 0) * 60000) + ((parts[2] || 0) * 1000);
  };

  const addSortColumn = () => {
    setSortColumns([...sortColumns, { column: null, direction: 'asc' }]);
  };

  const removeSortColumn = (index) => {
    setSortColumns(sortColumns.filter((_, i) => i !== index));
  };

  const updateSortColumn = (index, field, value) => {
    const newSort = [...sortColumns];
    newSort[index][field] = value;
    setSortColumns(newSort);
  };

  return (
    <Card className="bg-white/95 border-black/10 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <span className="font-bold">Advanced Filters</span>
          </div>
          <Button 
            onClick={() => setShowFilters(!showFilters)} 
            size="sm" 
            variant="outline"
            className="font-bold"
          >
            {showFilters ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Keyword Filters */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-600">REMARKS Keyword</Label>
                <Input
                  value={remarkKeyword}
                  onChange={(e) => setRemarkKeyword(e.target.value)}
                  placeholder="Search in remarks..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">REASON Keyword</Label>
                <Input
                  value={reasonKeyword}
                  onChange={(e) => setReasonKeyword(e.target.value)}
                  placeholder="Search in reason..."
                  className="mt-1"
                />
              </div>
            </div>

            {/* Time Range Filter */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-600">Time From (HH:MM:SS)</Label>
                <Input
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  placeholder="00:00:00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Time To (HH:MM:SS)</Label>
                <Input
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  placeholder="23:59:59"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Multi-Column Sort */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-600">Sort Priority</Label>
                <Button onClick={addSortColumn} size="sm" variant="outline">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Sort
                </Button>
              </div>
              {sortColumns.map((sort, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Badge className="bg-blue-100 text-blue-800 self-center">{index + 1}</Badge>
                  <Select value={sort.column || ""} onValueChange={(v) => updateSortColumn(index, 'column', v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sort.direction} onValueChange={(v) => updateSortColumn(index, 'direction', v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                  {sortColumns.length > 1 && (
                    <Button onClick={() => removeSortColumn(index)} size="sm" variant="outline">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleApply} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
              <Button onClick={handleClear} size="sm" variant="outline">
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            {/* Save/Load Filters */}
            <div className="border-t pt-4">
              <Label className="text-xs text-gray-600 mb-2 block">Save Current Filter</Label>
              <div className="flex gap-2">
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Filter name..."
                  className="flex-1"
                />
                <Button onClick={handleSave} size="sm" variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>

              {savedFilters && savedFilters.length > 0 && (
                <div className="mt-3">
                  <Label className="text-xs text-gray-600 mb-2 block">Saved Filters</Label>
                  <div className="flex flex-wrap gap-2">
                    {savedFilters.map((filter, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                        <Button 
                          onClick={() => handleLoad(filter)} 
                          size="sm" 
                          variant="ghost"
                          className="h-6 px-2 font-bold"
                        >
                          <FolderOpen className="w-3 h-3 mr-1" />
                          {filter.name}
                        </Button>
                        <Button 
                          onClick={() => onDeleteFilter(idx)} 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedFilterPanel;