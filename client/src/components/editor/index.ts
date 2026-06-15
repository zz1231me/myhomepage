// client/src/components/editor/index.ts
// ✅ CKEditor 5 기반 에디터

export { default as PostTitleInput } from './components/PostTitleInput';

// ✅ CKEditor 5 에디터 (메인)
export { default as CKEditorWrapper } from './core/CKEditorWrapper';
export type { CKEditorRef } from './core/CKEditorWrapper';

// Fallback 에디터 (에러 복구용)
export { default as FallbackEditor } from './core/FallbackEditor';
export { default as EditorErrorBoundary } from './core/EditorErrorBoundary';
