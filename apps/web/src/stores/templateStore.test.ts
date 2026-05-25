import { beforeEach, describe, expect, it } from 'vitest';
import { useTemplateStore, createEmptyTemplateForm } from './templateStore';

beforeEach(() => {
  useTemplateStore.setState({
    templateForm: createEmptyTemplateForm('en'),
    editingTemplateId: null,
    templateSearch: '',
    templateEditorLocale: 'en',
    selectedTemplateGroup: '',
    selectedTemplateBrowserGroup: '',
  });
});

describe('createEmptyTemplateForm', () => {
  it('returns a blank form for the given locale', () => {
    const form = createEmptyTemplateForm('de');
    expect(form.defaultLocale).toBe('de');
    expect(form.title).toBe('');
    expect(form.variants).toEqual([]);
  });
});

describe('setTemplateForm functional updater', () => {
  it('merges partial updates into the existing form', () => {
    useTemplateStore.getState().setTemplateForm((prev) => ({ ...prev, title: 'New Template' }));
    expect(useTemplateStore.getState().templateForm.title).toBe('New Template');
  });

  it('accepts a direct value', () => {
    const newForm = createEmptyTemplateForm('en');
    newForm.groupTitle = 'Kitchen';
    useTemplateStore.getState().setTemplateForm(newForm);
    expect(useTemplateStore.getState().templateForm.groupTitle).toBe('Kitchen');
  });
});

describe('setEditingTemplateId', () => {
  it('tracks the editing template id', () => {
    useTemplateStore.getState().setEditingTemplateId('t1');
    expect(useTemplateStore.getState().editingTemplateId).toBe('t1');
    useTemplateStore.getState().setEditingTemplateId(null);
    expect(useTemplateStore.getState().editingTemplateId).toBeNull();
  });
});
