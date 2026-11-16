import { useStore } from './useStore.js';

/** The household the current user belongs to. */
export const useMyHousehold = () => useStore((s) => s.households.find((h) => h.id === s.identity.householdId) || null);
export const useMyBusiness = () => useStore((s) => s.businesses.find((b) => b.id === s.identity.businessId) || null);
export const useMyOrg = () => useStore((s) => s.orgs.find((o) => o.id === s.identity.orgId) || null);

export function useInEvent(entity) {
  const event = useStore((s) => s.event);
  const phase = useStore((s) => s.phase);
  return phase === 'active' && !!event && !!entity && event.zones.includes(entity.zone);
}

/** Verified responders see household details only during an active event. */
export function useResponderAccess() {
  return useStore((s) => {
    const active = s.phase === 'active';
    if (s.role === 'admin') return { level: 'admin', active, medical: false };
    if (s.role === 'rescue') {
      const o = s.orgs.find((x) => x.id === s.identity.orgId);
      return { level: o?.status === 'approved' ? 'org' : 'none', active, medical: o?.status === 'approved' && active };
    }
    return { level: 'none', active, medical: false };
  });
}
