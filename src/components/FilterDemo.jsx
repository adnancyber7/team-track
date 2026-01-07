import React, { useState, useMemo, useCallback, useEffect } from 'react';
import EnhancedFilterBar from './EnhancedFilterBar';
import { applyFilters, getUniqueAgents, getUniqueRegions, getFilterStats } from '@/utils/filterHelpers';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';

const DEMO_DATA = [
  ['DONE', '123', '2026-01-07 09:30:00', 'LOT001', 'Priority delivery', 'John', '1234567890', 'On time', 'North', 'Yes', '', '', '', '', '', '', '', '', '', '', 'High'],
  ['PENDING', '124', '2026-01-07 10:15:00', 'LOT002', 'Standard delivery', 'Sarah', '9876543210', 'Waiting', 'South', '', '', '', '', '', '', '', '', '', '', '', 'Low'],
  ['REJECTED', '125', '2026-01-07 11:45:00', 'LOT003', 'Express delivery', 'Mike', '5555555555', 'Address issue', 'East', 'No', '', '', '', '', '', '', '', '', '', '', 'Medium'],
  ['DONE', '126', '2026-01-07 13:20:00', 'LOT004', 'Same day', 'John', '1111111111', 'Completed', 'West', 'Yes', '', '', '', '', '', '', '', '', '', '', 'High'],
  ['PENDING', '127', '2026-01-07 14:00:00', 'LOT005', 'Next day', 'Sarah', '2222222222', 'In transit', 'North', '', '', '', '', '', '', '', '', '', '', '', 'Medium'],
  ['DONE', '128', '2026-01-07 15:30:00', 'LOT006', 'Priority', 'Mike', '3333333333', 'Delivered', 'South', 'Yes', '', '', '', '', '', '', '', '', '', '', 'High'],
  ['REJECTED', '129', '2026-01-07 16:45:00', 'LOT007', 'Standard', 'John', '4444444444', 'Customer refused', 'East', 'No', '', '', '', '', '', '', '', '', '', '', 'Low'],
  ['PENDING', '130', '2026-01-06 09:00:00', 'LOT008', 'Express', 'Sarah', '6666666666', 'Processing', 'West', '', '', '', '', '', '', '', '', '', '', '', 'High'],
  ['DONE', '131', '2026-01-06 12:00:00', 'LOT009', 'Same day', 'Mike', '7777777777', 'Delivered', 'North', 'Yes', '', '', '', '', '', '', '', '', '', '', 'Medium'],
  ['PENDING', '132', '2026-01-06 14:30:00', 'LOT010', 'Next day', 'John', '8888888888', 'Scheduled', 'South', '', '', '', '', '', '', '', '', '', '', '', 'Low'],
];

const COLUMNS = ['STATUS', 'LINE', 'TIME', 'LOT', 'REMARKS', 'AGENTS', "AWB'S", 'REASON', 'REGION'];

export default function FilterDemo() {
  const [currentFilters, setCurrentFilters] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('filter_demo_saved');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const uniqueAgents = useMemo(() => getUniqueAgents(DEMO_DATA), []);
  const uniqueRegions = useMemo(() => getUniqueRegions(DEMO_DATA), []);

  const filteredRows = useMemo(() => {
    if (!currentFilters) return DEMO_DATA;
    return applyFilters(DEMO_DATA, currentFilters);
  }, [currentFilters]);

  const filterStats = useMemo(() => {
    if (!currentFilters) {
      return {
        total: DEMO_DATA.length,
        filtered: DEMO_DATA.length,
        pending: DEMO_DATA.filter(r => r[0] === 'PENDING').length,
        done: DEMO_DATA.filter(r => r[0] === 'DONE').length,
        rejected: DEMO_DATA.filter(r => r[0] === 'REJECTED').length,
      };
    }
    return getFilterStats(DEMO_DATA, currentFilters);
  }, [currentFilters]);

  const handleApplyFilters = useCallback((filters) => {
    setCurrentFilters(filters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setCurrentFilters(null);
  }, []);

  const handleSaveFilter = useCallback((filter) => {
    const updated = [...savedFilters, filter];
    setSavedFilters(updated);
    localStorage.setItem('filter_demo_saved', JSON.stringify(updated));
  }, [savedFilters]);

  const handleDeleteFilter = useCallback((filter) => {
    const updated = savedFilters.filter(f => f.name !== filter.name);
    setSavedFilters(updated);
    localStorage.setItem('filter_demo_saved', JSON.stringify(updated));
  }, [savedFilters]);

  const handleLoadFilter = useCallback((filter) => {
    handleApplyFilters(filter);
  }, [handleApplyFilters]);

  const getStatusIcon = (status) => {
    switch(status.toUpperCase()) {
      case 'DONE': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'REJECTED': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'DONE': 'bg-green-100 text-green-800 border-green-300',
      'REJECTED': 'bg-red-100 text-red-800 border-red-300',
      'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return variants[status.toUpperCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-yellow-500" />
            Enhanced Filter Demo
          </h1>
          <p className="text-gray-600 mt-2">
            Try the powerful filtering system with demo data
          </p>
        </div>

        <EnhancedFilterBar
          columns={COLUMNS}
          agents={uniqueAgents}
          regions={uniqueRegions}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          savedFilters={savedFilters}
          onSaveFilter={handleSaveFilter}
          onDeleteFilter={handleDeleteFilter}
          onLoadFilter={handleLoadFilter}
          initial={currentFilters}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterStats.total}</div>
              <p className="text-xs text-gray-500 mt-1">All records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Filtered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{filterStats.filtered}</div>
              <p className="text-xs text-gray-500 mt-1">
                {((filterStats.filtered / filterStats.total) * 100).toFixed(0)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Done:</span>
                  <span className="font-semibold">{filterStats.done}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Pending:</span>
                  <span className="font-semibold">{filterStats.pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Rejected:</span>
                  <span className="font-semibold">{filterStats.rejected}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {currentFilters ? Object.keys(currentFilters).filter(k => {
                  const val = currentFilters[k];
                  if (typeof val === 'object' && val !== null) {
                    return Object.values(val).some(v => v);
                  }
                  return val && val !== 'all' && val !== '';
                }).length : 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Filters applied</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {COLUMNS.map((col, idx) => (
                      <TableHead key={idx} className="font-semibold">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length} className="text-center py-8 text-gray-500">
                        No results found. Try adjusting your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                        {row.slice(0, COLUMNS.length).map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="py-3">
                            {cellIdx === 0 ? (
                              <Badge variant="outline" className={`${getStatusBadge(cell)} flex items-center gap-1 w-fit`}>
                                {getStatusIcon(cell)}
                                {cell}
                              </Badge>
                            ) : (
                              <span className="text-sm">{cell}</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
