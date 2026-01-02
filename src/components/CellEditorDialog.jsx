import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit3, Save, X } from 'lucide-react';

export default function CellEditorDialog({ 
  open, 
  onOpenChange, 
  value, 
  onChange, 
  onSave, 
  rowIndex, 
  columnName,
  readOnly = false
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
      if (!readOnly) {
        textareaRef.current.select();
      }
    }
  }, [open, readOnly]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      if (!readOnly) {
        onSave();
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="max-w-2xl backdrop-blur-3xl bg-gradient-to-br from-black/50 via-yellow-900/40 to-black/50 border border-yellow-500/30 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        style={{
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0 0 60px rgba(251, 191, 36, 0.3)'
        }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-yellow-300 shadow-lg">
              {readOnly ? (
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <Edit3 className="w-6 h-6 text-black" />
              )}
            </div>
            <div>
              <span className="text-yellow-400">{readOnly ? 'View' : 'Edit'} Cell</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-yellow-400 text-black font-bold text-xs">
                  Row {rowIndex + 1}
                </Badge>
                <Badge className="bg-orange-500 text-white font-bold text-xs">
                  {columnName}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4" onClick={(e) => e.stopPropagation()}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => !readOnly && onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            readOnly={readOnly}
            className={`w-full min-h-[200px] max-h-[400px] p-4 rounded-xl border-2 text-lg font-medium resize-y ${
              readOnly 
                ? 'bg-blue-50/90 border-blue-400 text-gray-900 cursor-text' 
                : 'bg-white border-yellow-400 text-gray-900 focus:ring-4 focus:ring-yellow-400/30 focus:border-yellow-500'
            }`}
            style={{
              outline: 'none',
              fontFamily: 'inherit'
            }}
            placeholder={readOnly ? '' : 'Enter cell value...'}
          />
          {!readOnly && (
            <p className="text-xs text-gray-300 mt-2">
              💡 Press <kbd className="px-1.5 py-0.5 bg-yellow-400/20 rounded border border-yellow-400/40 font-mono">Ctrl+Enter</kbd> to save quickly
            </p>
          )}
          {readOnly && (
            <p className="text-xs text-blue-300 mt-2">
              ℹ️ This column is read-only. You can view and copy the content.
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="flex-1 font-bold bg-white/10 text-white border-white/20 hover:bg-white/20">
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button
              onClick={() => {
                onSave();
                onOpenChange(false);
              }}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}