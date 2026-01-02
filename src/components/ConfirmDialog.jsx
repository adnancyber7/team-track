import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, X, CheckCircle2 } from 'lucide-react';

export default function ConfirmDialog({ 
  open, 
  onOpenChange, 
  title, 
  message, 
  onConfirm, 
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning" // warning, danger, success
}) {
  const variants = {
    warning: {
      icon: AlertCircle,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      buttonClass: 'bg-orange-600 hover:bg-orange-700'
    },
    danger: {
      icon: Trash2,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      buttonClass: 'bg-red-600 hover:bg-red-700'
    },
    success: {
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      buttonClass: 'bg-green-600 hover:bg-green-700'
    }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md backdrop-blur-3xl bg-gradient-to-br from-black/50 via-red-900/40 to-black/50 border border-yellow-500/30 shadow-2xl"
        style={{
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0 0 60px rgba(251, 191, 36, 0.3)'
        }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center border-2 ${config.borderColor}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <span className="text-yellow-400">{title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-white text-lg leading-relaxed">
            {message}
          </p>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="flex-1 font-bold bg-white/10 text-white border-white/20 hover:bg-white/20">
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={`flex-1 text-white font-black ${config.buttonClass}`}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}