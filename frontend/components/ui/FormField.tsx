import React from 'react';

interface FormFieldProps {
  label: string;
  value: string | number;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
  isMono?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  value = "", 
  placeholder = "", 
  onChange, 
  type = "text", 
  isMono = false 
}) => {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">
        {label}
      </label>
      <input 
        type={type} 
        value={value} 
        placeholder={placeholder} 
        className={`w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none focus:border-black focus:bg-white font-bold transition-all shadow-sm ${isMono ? 'font-mono' : ''}`} 
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};
