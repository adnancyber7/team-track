import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileBarChart, Camera } from 'lucide-react';
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

const DailyReportDialog = ({ csSheet, agents, columns }) => {
  const [open, setOpen] = useState(false);
  const reportRef = React.useRef(null);
  
  const COL_AGENTS = 5;
  const COL_AWB = 6;
  const COL_LINE = 1;
  const COL_REJ2 = 11;
  const COL_REJ3 = 13;
  const COL_REJ4 = 15;
  const COL_REJ5 = 17;
  
  const parseLineSum = (lineVal) => {
    const str = String(lineVal || "").trim();
    if (!str) return 0;
    const nums = str.split(/[+\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
  };

  const generateReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const report = {};
    
    agents.forEach(agent => {
      report[agent.username] = {
        username: agent.username,
        done: [],
        doneCount: 0,
        doneLineSum: 0,
        rejected: [],
        rejectedCount: 0,
        rejectedLineSum: 0,
        rejectionReasons: []
      };
    });
    
    for (let r = 0; r < csSheet.raw.length; r++) {
      const agentName = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      if (!agentName) continue;
      
      const agentReport = Object.values(report).find(
        a => a.username.toLowerCase() === agentName
      );
      if (!agentReport) continue;
      
      const state = csSheet.timers[r]?.state?.toUpperCase() || '';
      const awb = csSheet.raw[r]?.[COL_AWB] || '';
      const lineSum = parseLineSum(csSheet.raw[r]?.[COL_LINE]);
      
      if (state === 'DONE' && awb.trim()) {
        agentReport.done.push(awb);
        agentReport.doneCount++;
        agentReport.doneLineSum += lineSum;
      } else if (state === 'REJECTED' && awb.trim()) {
        agentReport.rejected.push(awb);
        agentReport.rejectedCount++;
        agentReport.rejectedLineSum += lineSum;
        
        const reasons = [
          csSheet.raw[r]?.[COL_REJ2],
          csSheet.raw[r]?.[COL_REJ3],
          csSheet.raw[r]?.[COL_REJ4],
          csSheet.raw[r]?.[COL_REJ5]
        ].filter(r => r && r.trim());
        
        if (reasons.length > 0) {
          agentReport.rejectionReasons.push({
            awb,
            reasons: reasons.join(', ')
          });
        }
      }
    }
    
    return Object.values(report).filter(r => r.doneCount > 0 || r.rejectedCount > 0);
  };

  const downloadExcel = () => {
    const reportData = generateReport();
    const today = new Date().toISOString().split('T')[0];
    
    const worksheetData = [
      ['Daily Report - ' + today],
      [],
      ['Agent', 'Done Count', 'Done AWBs', 'Done Line Sum', 'Rejected Count', 'Rejected AWBs', 'Rejected Line Sum', 'Rejection Reasons'],
    ];
    
    reportData.forEach(agent => {
      worksheetData.push([
        agent.username,
        agent.doneCount,
        agent.done.join(', '),
        agent.doneLineSum,
        agent.rejectedCount,
        agent.rejected.join(', '),
        agent.rejectedLineSum,
        agent.rejectionReasons.map(r => `${r.awb}: ${r.reasons}`).join(' | ')
      ]);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Report');
    XLSX.writeFile(workbook, `DHL_Daily_Report_${today}.xlsx`);
    toast.success('Report downloaded successfully');
  };

  const takeSnapshot = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#fff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `DHL_Daily_Report_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success('Snapshot saved successfully');
    } catch (error) {
      toast.error('Failed to take snapshot');
    }
  };

  const reportData = generateReport();
  const totalDone = reportData.reduce((sum, r) => sum + r.doneCount, 0);
  const totalRejected = reportData.reduce((sum, r) => sum + r.rejectedCount, 0);
  const totalDoneLines = reportData.reduce((sum, r) => sum + r.doneLineSum, 0);
  const totalRejectedLines = reportData.reduce((sum, r) => sum + r.rejectedLineSum, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-bold bg-blue-50 hover:bg-blue-100 border-blue-300">
          <FileBarChart className="w-4 h-4 mr-2" />
          Daily Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileBarChart className="w-5 h-5" />
            Daily Work Report - {new Date().toLocaleDateString()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={downloadExcel} size="sm" className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Download Excel
            </Button>
            <Button onClick={takeSnapshot} size="sm" variant="outline">
              <Camera className="w-4 h-4 mr-2" />
              Take Snapshot
            </Button>
          </div>
          
          <div ref={reportRef} className="space-y-4 p-4 bg-white">
            {/* Summary */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-3">Overall Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-600">{totalDone}</div>
                    <div className="text-xs text-gray-600">Total Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-blue-600">{totalDoneLines}</div>
                    <div className="text-xs text-gray-600">Done Lines</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-red-600">{totalRejected}</div>
                    <div className="text-xs text-gray-600">Total Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-orange-600">{totalRejectedLines}</div>
                    <div className="text-xs text-gray-600">Rejected Lines</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Agent Reports */}
            <div className="space-y-3">
              {reportData.map(agent => (
                <Card key={agent.username} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-yellow-400 text-black font-black">{agent.username}</Badge>
                      <div className="flex gap-3 text-sm">
                        <span className="text-green-700 font-bold">✓ {agent.doneCount} Done</span>
                        <span className="text-red-700 font-bold">✗ {agent.rejectedCount} Rejected</span>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Done Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">DONE: {agent.doneCount}</Badge>
                          <span className="text-xs text-gray-600">Lines: {agent.doneLineSum}</span>
                        </div>
                        {agent.done.length > 0 && (
                          <div className="bg-green-50 p-2 rounded text-xs">
                            <div className="font-bold mb-1">AWBs:</div>
                            <div className="flex flex-wrap gap-1">
                              {agent.done.slice(0, 10).map((awb, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{awb}</Badge>
                              ))}
                              {agent.done.length > 10 && (
                                <Badge variant="outline" className="text-xs">+{agent.done.length - 10} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Rejected Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">REJECTED: {agent.rejectedCount}</Badge>
                          <span className="text-xs text-gray-600">Lines: {agent.rejectedLineSum}</span>
                        </div>
                        {agent.rejected.length > 0 && (
                          <div className="bg-red-50 p-2 rounded text-xs">
                            <div className="font-bold mb-1">AWBs:</div>
                            <div className="flex flex-wrap gap-1">
                              {agent.rejected.slice(0, 10).map((awb, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{awb}</Badge>
                              ))}
                              {agent.rejected.length > 10 && (
                                <Badge variant="outline" className="text-xs">+{agent.rejected.length - 10} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {agent.rejectionReasons.length > 0 && (
                          <div className="bg-orange-50 p-2 rounded text-xs">
                            <div className="font-bold mb-1">Rejection Reasons:</div>
                            {agent.rejectionReasons.slice(0, 5).map((r, i) => (
                              <div key={i} className="mb-1">
                                <span className="font-mono">{r.awb}</span>: {r.reasons}
                              </div>
                            ))}
                            {agent.rejectionReasons.length > 5 && (
                              <div className="text-gray-600">...and {agent.rejectionReasons.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyReportDialog;