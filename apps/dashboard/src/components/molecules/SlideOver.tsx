import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Button } from '../atoms/Button';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export function SlideOver({ isOpen, onClose, title, children, footer, size = 'md' }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trap focus
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  if (!isOpen) return null;

  return (
    <div className="relative z-50" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500/75 transition-opacity" 
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel container */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            {/* Panel */}
            <div 
              ref={panelRef}
              tabIndex={-1}
              className={twMerge(
                "pointer-events-auto w-screen transform transition ease-in-out duration-300 outline-none",
                sizeClasses[size]
              )}
            >
              <div className="flex h-full flex-col bg-white shadow-xl">
                {/* Header */}
                <div className="px-4 py-6 sm:px-6 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <h2 className="text-base font-semibold leading-6 text-gray-900" id="slide-over-title">
                      {title}
                    </h2>
                    <div className="ml-3 flex h-7 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 p-1"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close panel</span>
                        <X className="h-5 w-5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Body */}
                <div className="relative flex-1 px-4 py-6 sm:px-6 overflow-y-auto">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="border-t border-gray-200 px-4 py-4 sm:px-6 bg-gray-50 flex justify-end gap-3">
                    {footer}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
