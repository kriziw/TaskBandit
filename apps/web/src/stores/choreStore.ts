import { create } from 'zustand';
import type { ChoreState, CreateChoreInstanceInput } from '../types/taskbandit';

export type HouseholdChoreViewMode = 'list' | 'board' | 'calendar';
export type HouseholdChoreStateFilter = 'all' | ChoreState;
export type ChoreExportStatusFilter = 'all' | 'active' | 'historic' | ChoreState;
export type InstanceFormState = CreateChoreInstanceInput & { templateGroupTitle?: string };

const emptyInstanceForm = (): InstanceFormState => ({
  templateId: '',
  assigneeId: '',
  title: '',
  dueAt: '',
  reassignAutomatically: false,
  recurrenceEndMode: 'never',
  recurrenceOccurrences: 3,
  recurrenceEndsAt: '',
});

interface ChoreStore {
  // Submission state
  submitSelections: Record<string, string[]>;
  selectedProofFiles: Record<string, File[]>;
  submitNotes: Record<string, string>;
  reviewNotes: Record<string, string>;

  // Instance editing
  instanceForm: InstanceFormState;
  editingInstanceId: string | null;

  // Household view filters
  householdViewMode: HouseholdChoreViewMode;
  householdStateFilter: HouseholdChoreStateFilter;
  householdAssigneeFilter: string;

  // History / export
  historyPage: number;
  exportAssigneeFilter: string;
  exportStatusFilter: ChoreExportStatusFilter;
  exportDateFrom: string;
  exportDateTo: string;

  // Composer
  isClientComposerOpen: boolean;

  // Mobile due-date editor
  mobileDueEditorInstanceId: string | null;
  mobileDueEditorValue: string;
  mobileDueEditorTitle: string;
  mobileDueEditorIconId: string;
  mobileDueEditorVariantId: string;

  // Mobile card / dialog
  mobileCardMenuInstanceId: string | null;
  mobileChoreDialogInstanceId: string | null;

  // Quick log
  isQuickLogComposerOpen: boolean;
  quickLogQuery: string;
  quickLogNote: string;
  quickLogSelectedInstanceId: string | null;
  quickLogSelectedTemplateId: string | null;
  quickLogCreateTemplateFromEntry: boolean;
  quickLogDifficulty: string;
  quickLogIcon: string | null;

  // Takeover request dialog
  takeoverRequestInstanceId: string | null;
  takeoverRequestMemberId: string;
  takeoverRequestNote: string;

  // Visibility toggles
  showMobileCompletedChores: boolean;
  showDesktopChoreHistory: boolean;

  // Setters
  setSubmitSelections: (
    v: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>),
  ) => void;
  setSelectedProofFiles: (
    v: Record<string, File[]> | ((prev: Record<string, File[]>) => Record<string, File[]>),
  ) => void;
  setSubmitNotes: (
    v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  setReviewNotes: (
    v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;

  setInstanceForm: (
    v: InstanceFormState | ((prev: InstanceFormState) => InstanceFormState),
  ) => void;
  setEditingInstanceId: (v: string | null) => void;

  setHouseholdViewMode: (v: HouseholdChoreViewMode) => void;
  setHouseholdStateFilter: (v: HouseholdChoreStateFilter) => void;
  setHouseholdAssigneeFilter: (v: string) => void;

  setHistoryPage: (v: number) => void;
  setExportAssigneeFilter: (v: string) => void;
  setExportStatusFilter: (v: ChoreExportStatusFilter) => void;
  setExportDateFrom: (v: string) => void;
  setExportDateTo: (v: string) => void;

  setIsClientComposerOpen: (v: boolean) => void;

  setMobileDueEditorInstanceId: (v: string | null) => void;
  setMobileDueEditorValue: (v: string) => void;
  setMobileDueEditorTitle: (v: string) => void;
  setMobileDueEditorIconId: (v: string) => void;
  setMobileDueEditorVariantId: (v: string) => void;
  setMobileCardMenuInstanceId: (v: string | null) => void;
  setMobileChoreDialogInstanceId: (v: string | null) => void;

  setIsQuickLogComposerOpen: (v: boolean) => void;
  setQuickLogQuery: (v: string) => void;
  setQuickLogNote: (v: string) => void;
  setQuickLogSelectedInstanceId: (v: string | null) => void;
  setQuickLogSelectedTemplateId: (v: string | null) => void;
  setQuickLogCreateTemplateFromEntry: (v: boolean) => void;
  setQuickLogDifficulty: (v: string) => void;
  setQuickLogIcon: (v: string | null) => void;

  setTakeoverRequestInstanceId: (v: string | null) => void;
  setTakeoverRequestMemberId: (v: string) => void;
  setTakeoverRequestNote: (v: string) => void;

  setShowMobileCompletedChores: (v: boolean) => void;
  setShowDesktopChoreHistory: (v: boolean) => void;

  // Compound actions
  clearSubmitState: (instanceId: string) => void;
  closeMobileDueEditor: () => void;
  closeQuickLog: () => void;
  clearInstanceEdit: () => void;
}

export const useChoreStore = create<ChoreStore>((set, get) => ({
  submitSelections: {},
  selectedProofFiles: {},
  submitNotes: {},
  reviewNotes: {},

  instanceForm: emptyInstanceForm(),
  editingInstanceId: null,

  householdViewMode: 'list',
  householdStateFilter: 'all',
  householdAssigneeFilter: 'all',

  historyPage: 1,
  exportAssigneeFilter: 'all',
  exportStatusFilter: 'all',
  exportDateFrom: '',
  exportDateTo: '',

  isClientComposerOpen: false,

  mobileDueEditorInstanceId: null,
  mobileDueEditorValue: '',
  mobileDueEditorTitle: '',
  mobileDueEditorIconId: '',
  mobileDueEditorVariantId: '',

  mobileCardMenuInstanceId: null,
  mobileChoreDialogInstanceId: null,

  isQuickLogComposerOpen: false,
  quickLogQuery: '',
  quickLogNote: '',
  quickLogSelectedInstanceId: null,
  quickLogSelectedTemplateId: null,
  quickLogCreateTemplateFromEntry: false,
  quickLogDifficulty: 'easy',
  quickLogIcon: null,

  takeoverRequestInstanceId: null,
  takeoverRequestMemberId: '',
  takeoverRequestNote: '',

  showMobileCompletedChores: false,
  showDesktopChoreHistory: false,

  setSubmitSelections: (v) =>
    set((s) => ({ submitSelections: typeof v === 'function' ? v(s.submitSelections) : v })),
  setSelectedProofFiles: (v) =>
    set((s) => ({ selectedProofFiles: typeof v === 'function' ? v(s.selectedProofFiles) : v })),
  setSubmitNotes: (v) =>
    set((s) => ({ submitNotes: typeof v === 'function' ? v(s.submitNotes) : v })),
  setReviewNotes: (v) =>
    set((s) => ({ reviewNotes: typeof v === 'function' ? v(s.reviewNotes) : v })),

  setInstanceForm: (v) =>
    set((state) => ({ instanceForm: typeof v === 'function' ? v(state.instanceForm) : v })),
  setEditingInstanceId: (v) => set({ editingInstanceId: v }),

  setHouseholdViewMode: (v) => set({ householdViewMode: v }),
  setHouseholdStateFilter: (v) => set({ householdStateFilter: v }),
  setHouseholdAssigneeFilter: (v) => set({ householdAssigneeFilter: v }),

  setHistoryPage: (v) => set({ historyPage: v }),
  setExportAssigneeFilter: (v) => set({ exportAssigneeFilter: v }),
  setExportStatusFilter: (v) => set({ exportStatusFilter: v }),
  setExportDateFrom: (v) => set({ exportDateFrom: v }),
  setExportDateTo: (v) => set({ exportDateTo: v }),

  setIsClientComposerOpen: (v) => set({ isClientComposerOpen: v }),

  setMobileDueEditorInstanceId: (v) => set({ mobileDueEditorInstanceId: v }),
  setMobileDueEditorValue: (v) => set({ mobileDueEditorValue: v }),
  setMobileDueEditorTitle: (v) => set({ mobileDueEditorTitle: v }),
  setMobileDueEditorIconId: (v) => set({ mobileDueEditorIconId: v }),
  setMobileDueEditorVariantId: (v) => set({ mobileDueEditorVariantId: v }),
  setMobileCardMenuInstanceId: (v) => set({ mobileCardMenuInstanceId: v }),
  setMobileChoreDialogInstanceId: (v) => set({ mobileChoreDialogInstanceId: v }),

  setIsQuickLogComposerOpen: (v) => set({ isQuickLogComposerOpen: v }),
  setQuickLogQuery: (v) => set({ quickLogQuery: v }),
  setQuickLogNote: (v) => set({ quickLogNote: v }),
  setQuickLogSelectedInstanceId: (v) => set({ quickLogSelectedInstanceId: v }),
  setQuickLogSelectedTemplateId: (v) => set({ quickLogSelectedTemplateId: v }),
  setQuickLogCreateTemplateFromEntry: (v) => set({ quickLogCreateTemplateFromEntry: v }),
  setQuickLogDifficulty: (v) => set({ quickLogDifficulty: v }),
  setQuickLogIcon: (v) => set({ quickLogIcon: v }),

  setTakeoverRequestInstanceId: (v) => set({ takeoverRequestInstanceId: v }),
  setTakeoverRequestMemberId: (v) => set({ takeoverRequestMemberId: v }),
  setTakeoverRequestNote: (v) => set({ takeoverRequestNote: v }),

  setShowMobileCompletedChores: (v) => set({ showMobileCompletedChores: v }),
  setShowDesktopChoreHistory: (v) => set({ showDesktopChoreHistory: v }),

  clearSubmitState: (instanceId) => {
    const { submitSelections, selectedProofFiles, submitNotes, reviewNotes } = get();
    const { [instanceId]: _s, ...nextSelections } = submitSelections;
    const { [instanceId]: _f, ...nextFiles } = selectedProofFiles;
    const { [instanceId]: _n, ...nextNotes } = submitNotes;
    const { [instanceId]: _r, ...nextReview } = reviewNotes;
    set({
      submitSelections: nextSelections,
      selectedProofFiles: nextFiles,
      submitNotes: nextNotes,
      reviewNotes: nextReview,
    });
  },

  closeMobileDueEditor: () =>
    set({
      mobileDueEditorInstanceId: null,
      mobileDueEditorValue: '',
      mobileDueEditorTitle: '',
      mobileDueEditorIconId: '',
      mobileDueEditorVariantId: '',
      mobileCardMenuInstanceId: null,
    }),

  closeQuickLog: () =>
    set({
      isQuickLogComposerOpen: false,
      quickLogQuery: '',
      quickLogNote: '',
      quickLogSelectedInstanceId: null,
      quickLogSelectedTemplateId: null,
      quickLogCreateTemplateFromEntry: false,
      quickLogDifficulty: 'easy',
      quickLogIcon: null,
    }),

  clearInstanceEdit: () => set({ editingInstanceId: null, instanceForm: emptyInstanceForm() }),
}));
