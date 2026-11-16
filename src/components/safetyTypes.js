import { Hospital, Stethoscope, Tent, Flame, BadgeAlert, Pill, Mountain, Package } from 'lucide-react';

export const SP_TYPES = {
  hospital: { label: 'Hospital', icon: Hospital, color: '#D32F2F' },
  clinic: { label: 'Clinic', icon: Stethoscope, color: '#C62828' },
  evacuation: { label: 'Evacuation centre', icon: Tent, color: '#2E7D32' },
  fire: { label: 'Fire station', icon: Flame, color: '#E65100' },
  police: { label: 'Police station', icon: BadgeAlert, color: '#1565C0' },
  pharmacy: { label: 'Pharmacy', icon: Pill, color: '#00796B' },
  assembly: { label: 'High-ground assembly point', icon: Mountain, color: '#5D4037' },
  relief: { label: 'Relief distribution point', icon: Package, color: '#6A1B9A' },
};
