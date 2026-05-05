import { Batch, User } from '../types';
import { STABLE_BATCH_STATUSES } from './constants';

export const canPerformAction = (batch: Batch, user: User | null): boolean => {
  const isOwner = user?.org === batch.ownerOrg;
  const isStableState = (STABLE_BATCH_STATUSES as readonly string[]).includes(batch.status);
  return isOwner && isStableState;
};
