import { create } from 'zustand';
import type { CreateChoreTemplateInput, TemplateTranslationLocale } from '../types/taskbandit';

export type TemplateFormState = CreateChoreTemplateInput;

export function createEmptyTemplateForm(
  defaultLocale: TemplateTranslationLocale,
): TemplateFormState {
  return {
    defaultLocale,
    groupTitle: '',
    title: '',
    description: '',
    translations: [],
    difficulty: 'easy',
    assignmentStrategy: 'round_robin',
    recurrenceType: 'none',
    recurrenceIntervalDays: 2,
    recurrenceWeekdays: [],
    requirePhotoProof: false,
    stickyFollowUpAssignee: false,
    recurrenceStartStrategy: 'due_at',
    variants: [],
    dependencyTemplateIds: [],
    dependencyRules: [],
    checklist: [],
  };
}

interface TemplateStore {
  templateForm: TemplateFormState;
  editingTemplateId: string | null;
  templateSearch: string;
  templateEditorLocale: TemplateTranslationLocale;
  selectedTemplateGroup: string;
  selectedTemplateBrowserGroup: string;

  setTemplateForm: (
    v: TemplateFormState | ((prev: TemplateFormState) => TemplateFormState),
  ) => void;
  setEditingTemplateId: (v: string | null) => void;
  setTemplateSearch: (v: string) => void;
  setTemplateEditorLocale: (v: TemplateTranslationLocale) => void;
  setSelectedTemplateGroup: (v: string) => void;
  setSelectedTemplateBrowserGroup: (v: string) => void;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  templateForm: createEmptyTemplateForm('en'),
  editingTemplateId: null,
  templateSearch: '',
  templateEditorLocale: 'en',
  selectedTemplateGroup: '',
  selectedTemplateBrowserGroup: '',

  setTemplateForm: (v) =>
    set((s) => ({ templateForm: typeof v === 'function' ? v(s.templateForm) : v })),
  setEditingTemplateId: (v) => set({ editingTemplateId: v }),
  setTemplateSearch: (v) => set({ templateSearch: v }),
  setTemplateEditorLocale: (v) => set({ templateEditorLocale: v }),
  setSelectedTemplateGroup: (v) => set({ selectedTemplateGroup: v }),
  setSelectedTemplateBrowserGroup: (v) => set({ selectedTemplateBrowserGroup: v }),
}));
