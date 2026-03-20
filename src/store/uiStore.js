import { create } from 'zustand';

export const useUiStore = create((set, get) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Modals
  modals: {},
  openModal: (key, data = null) =>
    set((s) => ({ modals: { ...s.modals, [key]: { open: true, data } } })),
  closeModal: (key) =>
    set((s) => ({ modals: { ...s.modals, [key]: { open: false, data: null } } })),
  isModalOpen: (key) => !!get().modals[key]?.open,
  getModalData: (key) => get().modals[key]?.data ?? null,

  // Global loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // Notifications panel
  notificationsPanelOpen: false,
  toggleNotificationsPanel: () =>
    set((s) => ({ notificationsPanelOpen: !s.notificationsPanelOpen })),

  // Active page title (for header)
  pageTitle: '',
  setPageTitle: (title) => set({ pageTitle: title }),

  // Command palette
  commandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  // Welcome modal (shown on first login)
  showWelcomeModal: false,
  setShowWelcomeModal: (show) => set({ showWelcomeModal: show }),
}));
