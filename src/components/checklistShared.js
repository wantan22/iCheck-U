import { FileText, Pill, Wallet, Smartphone, Briefcase, Baby } from 'lucide-react';
import { useStore } from '../store/useStore.js';

export const CATEGORIES = {
  documents: { label: 'Documents', icon: FileText },
  medical: { label: 'Medical', icon: Pill },
  money: { label: 'Money and valuables', icon: Wallet },
  devices: { label: 'Devices', icon: Smartphone },
  kit: { label: 'Emergency kit', icon: Briefcase },
  family: { label: 'Family needs', icon: Baby },
};
export const PRIORITY = {
  first: { label: 'Grab first', cls: 'bg-emergency text-white' },
  time: { label: 'Grab if time allows', cls: 'bg-caution text-neutral-900' },
  leave: { label: 'Can leave', cls: 'bg-pending text-white' },
};
export const FORMAT = { physical: 'Physical', digital: 'Digital copy', both: 'Both' };
export const RECOVERY = {
  found: { label: 'Found', cls: 'btn-green' },
  damaged: { label: 'Damaged', cls: 'btn-orange' },
  lost: { label: 'Lost', cls: 'btn-red' },
};

const SECRET = /\b(pin|password|passcode|kata laluan|combination|kombinasi|otp|cvv|\d{4,})\b/i;
export const looksSecret = (s = '') => SECRET.test(s);

export function useChecklistOwner(ownerType) {
  return useStore((s) => {
    if (ownerType === 'business') return s.businesses.find((b) => b.id === s.identity.businessId) || null;
    const id = s.identity.householdId;
    return s.households.find((h) => h.id === id) || null;
  });
}

const cacheKey = (type, id) => `ns-offline-${type}-${id}`;
export function cacheOffline(type, owner) {
  try {
    localStorage.setItem(cacheKey(type, owner.id), JSON.stringify({ at: Date.now(), checklist: owner.checklist }));
    return true;
  } catch {
    return false;
  }
}
