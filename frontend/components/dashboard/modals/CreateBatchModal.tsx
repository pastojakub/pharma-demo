import React from 'react';
import { FormField } from '../../ui/FormField';
import { NewBatch } from '../../../types';

interface CreateBatchModalProps {
  newBatch: NewBatch;
  setNewBatch: (batch: NewBatch) => void;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({ newBatch, setNewBatch }) => {
  return (
    <div className="space-y-6">
      <FormField
        label="ID Šarže"
        value={newBatch.id}
        placeholder="B-2026-001"
        onChange={(v: string) => setNewBatch({ ...newBatch, id: v })}
        isMono
      />
      <div className="grid grid-cols-2 gap-6">
        <FormField
          label="Množstvo do skladu"
          value={String(newBatch.quantity)}
          type="number"
          onChange={(v: string) => setNewBatch({ ...newBatch, quantity: Number(v) })}
        />
        <FormField
          label="Merná Jednotka"
          value={newBatch.unit}
          placeholder="ks / bal"
          onChange={(v: string) => setNewBatch({ ...newBatch, unit: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <FormField
          label="Cena (€)"
          value={String(newBatch.price)}
          type="number"
          onChange={(v: string) => setNewBatch({ ...newBatch, price: Number(v) })}
        />
        <FormField
          label="Exspirácia"
          value={newBatch.expiryDate}
          type="date"
          onChange={(v: string) => setNewBatch({ ...newBatch, expiryDate: v })}
        />
      </div>
    </div>
  );
};
