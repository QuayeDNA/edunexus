import { create } from 'zustand';

export const useUiStore = create((set, get) => ({
  // ── Sidebar ─────────────────────────────────────────────────────────────────
  // sidebarOpen    → mobile: whether overlay sidebar is visible
  // sidebarCollapsed → desktop: whether sidebar is in mini (icon-only) mode
  sidebarOpen:      false,
  sidebarCollapsed: false,

  setSidebarOpen:          (open) => set({ sidebarOpen: open }),
  toggleSidebar:           ()     => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapsed:  ()     => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── Modals ──────────────────────────────────────────────────────────────────
  modals: {},
  openModal:    (key, data = null) => set((s) => ({ modals: { ...s.modals, [key]: { open: true,  data } } })),
  closeModal:   (key)              => set((s) => ({ modals: { ...s.modals, [key]: { open: false, data: null } } })),
  isModalOpen:  (key)              => !!get().modals[key]?.open,
  getModalData: (key)              => get().modals[key]?.data ?? null,

  // ── Global loading ──────────────────────────────────────────────────────────
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // ── Notifications panel ─────────────────────────────────────────────────────
  notificationsPanelOpen:  false,
  toggleNotificationsPanel: () => set((s) => ({ notificationsPanelOpen: !s.notificationsPanelOpen })),

  // ── Page title ──────────────────────────────────────────────────────────────
  pageTitle:    '',
  setPageTitle: (title) => set({ pageTitle: title }),

  // ── Command palette ─────────────────────────────────────────────────────────
  commandPaletteOpen:   false,
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  // ── Welcome modal ───────────────────────────────────────────────────────────
  // The actual "show once" gate is handled in AdminLayout via localStorage.
  // This flag just controls whether the modal is rendered right now.
  showWelcomeModal:    false,
  setShowWelcomeModal: (show) => set({ showWelcomeModal: show }),
}));