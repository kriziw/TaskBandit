import { beforeEach, describe, expect, it } from 'vitest';
import { useChoreStore } from './choreStore';

beforeEach(() => {
  useChoreStore.setState({
    submitSelections: {},
    selectedProofFiles: {},
    submitNotes: {},
    reviewNotes: {},
    instanceForm: {
      templateId: '', assigneeId: '', title: '', dueAt: '',
      reassignAutomatically: false, recurrenceEndMode: 'never',
      recurrenceOccurrences: 3, recurrenceEndsAt: '',
    },
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
    quickLogUsePointsOverride: false,
    quickLogPointsOverride: '',
    quickLogIcon: null,
    showMobileCompletedChores: false,
    showDesktopChoreHistory: false,
  });
});

describe('clearSubmitState', () => {
  it('removes submit state for a specific instance', () => {
    useChoreStore.setState({
      submitSelections: { 'i1': ['a'], 'i2': ['b'] },
      selectedProofFiles: { 'i1': [] },
      submitNotes: { 'i1': 'note', 'i2': 'other' },
      reviewNotes: { 'i1': 'review' },
    });
    useChoreStore.getState().clearSubmitState('i1');
    const { submitSelections, submitNotes, reviewNotes } = useChoreStore.getState();
    expect(submitSelections).not.toHaveProperty('i1');
    expect(submitSelections).toHaveProperty('i2');
    expect(submitNotes).not.toHaveProperty('i1');
    expect(reviewNotes).not.toHaveProperty('i1');
  });
});

describe('closeMobileDueEditor', () => {
  it('resets all mobile due editor state including card menu', () => {
    useChoreStore.setState({
      mobileDueEditorInstanceId: 'x',
      mobileDueEditorValue: '2024-01-01',
      mobileDueEditorTitle: 'Clean',
      mobileDueEditorIconId: 'vacuum_floor',
      mobileDueEditorVariantId: 'v1',
      mobileCardMenuInstanceId: 'x',
    });
    useChoreStore.getState().closeMobileDueEditor();
    const s = useChoreStore.getState();
    expect(s.mobileDueEditorInstanceId).toBeNull();
    expect(s.mobileDueEditorValue).toBe('');
    expect(s.mobileCardMenuInstanceId).toBeNull();
  });
});

describe('closeQuickLog', () => {
  it('resets all quick log state and closes the composer', () => {
    useChoreStore.setState({
      isQuickLogComposerOpen: true,
      quickLogQuery: 'dishes',
      quickLogNote: 'note',
      quickLogSelectedInstanceId: 'i1',
      quickLogIcon: 'wash_dishes_sink',
    });
    useChoreStore.getState().closeQuickLog();
    const s = useChoreStore.getState();
    expect(s.isQuickLogComposerOpen).toBe(false);
    expect(s.quickLogQuery).toBe('');
    expect(s.quickLogSelectedInstanceId).toBeNull();
    expect(s.quickLogIcon).toBeNull();
  });
});

describe('setInstanceForm functional updater', () => {
  it('applies an updater function to the current form', () => {
    useChoreStore.getState().setInstanceForm((prev) => ({ ...prev, title: 'New title' }));
    expect(useChoreStore.getState().instanceForm.title).toBe('New title');
  });
});

describe('setSubmitSelections functional updater', () => {
  it('merges new selection into existing records', () => {
    useChoreStore.setState({ submitSelections: { 'i1': ['a'] } });
    useChoreStore.getState().setSubmitSelections((prev) => ({ ...prev, 'i2': ['b'] }));
    expect(useChoreStore.getState().submitSelections).toEqual({ 'i1': ['a'], 'i2': ['b'] });
  });
});
