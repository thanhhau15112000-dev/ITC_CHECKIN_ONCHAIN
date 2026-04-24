import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'teacher' | 'student';

type AuthBannerState = {
	role: UserRole | null;
	bannerDismissed: boolean;
	setRole: (role: UserRole) => void;
	clearRole: () => void;
	dismissBanner: () => void;
	restoreBanner: () => void;
};

export const useAuthBannerStore = create<AuthBannerState>()(
	persist(
		(set) => ({
			role: null,
			bannerDismissed: false,
			setRole: (role) => set({ role, bannerDismissed: false }),
			clearRole: () => set({ role: null, bannerDismissed: false }),
			dismissBanner: () => set({ bannerDismissed: true }),
			restoreBanner: () => set({ bannerDismissed: false }),
		}),
		{ name: 'auth-banner-store' },
	),
);
