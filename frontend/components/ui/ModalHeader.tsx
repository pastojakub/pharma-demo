import React from 'react';
import { StatusBadge } from './StatusBadge';

interface ModalHeaderProps {
  decorIcon: React.ReactNode;
  label: string;
  title: string;
  titleMono?: boolean;
  status?: string;
  statusLabel?: string;
  rightContent?: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  decorIcon,
  label,
  title,
  titleMono = false,
  status,
  statusLabel,
  rightContent,
  className = 'bg-black',
}) => (
  <div
    className={`p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex justify-between items-center ${className}`}
  >
    <div className="absolute top-0 right-0 p-8 opacity-10">{decorIcon}</div>
    <div className="relative z-10">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
        {label}
      </label>
      <p className={`text-4xl font-black tracking-tighter ${titleMono ? 'font-mono' : ''}`}>
        {title}
      </p>
      {status && (
        <div className="mt-6 flex items-center">
          <StatusBadge status={status} />
          {statusLabel && (
            <span className="ml-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
              {statusLabel}
            </span>
          )}
        </div>
      )}
    </div>
    {rightContent && <div className="z-10">{rightContent}</div>}
  </div>
);
