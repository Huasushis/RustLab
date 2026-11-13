import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { Diagnostic } from '../lib/check.ts';
import { monaco } from '../lib/monaco.ts';

export interface EditorHandle {
  setValue(v: string): void;
  getValue(): string;
  reveal(line: number, col: number): void;
  focus(): void;
}

interface Props {
  /** 每个关卡一个独立的 model：切换关卡时撤销历史互不干扰，就像 VS Code 里的多个文件 */
  fileKey: string;
  initialValue: string;
  diagnostics: Diagnostic[];
  fontSize: number;
  onChange(value: string): void;
  onCursor(line: number, col: number): void;
  onRun(): void;
  onCheck(): void;
  onFormat(): void;
  ref?: Ref<EditorHandle>;
}

const models = new Map<string, monaco.editor.ITextModel>();

function modelFor(key: string, initial: string): monaco.editor.ITextModel {
  let m = models.get(key);
  if (!m || m.isDisposed()) {
    m = monaco.editor.createModel(initial, 'rust', monaco.Uri.parse(`file:///${key}/main.rs`));
    models.set(key, m);
  }
  return m;
}

export function CodeEditor(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  // 回调放进 ref，编辑器只创建一次，但总能调用到最新的回调
  const cb = useRef(props);
  cb.current = props;

  useEffect(() => {
    const ed = monaco.editor.create(host.current!, {
      model: modelFor(props.fileKey, props.initialValue),
      automaticLayout: true,
      fontSize: props.fontSize,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 4,
      insertSpaces: true,
      renderWhitespace: 'selection',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      padding: { top: 10, bottom: 10 },
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: 'active', indentation: true },
      stickyScroll: { enabled: false },
      fixedOverflowWidgets: true,
      'semanticHighlighting.enabled': false,
    });
    editor.current = ed;

    cb.current.onChange(ed.getValue());
    ed.onDidChangeModelContent(() => cb.current.onChange(ed.getValue()));
    ed.onDidChangeCursorPosition((e) => cb.current.onCursor(e.position.lineNumber, e.position.column));
    const { KeyMod, KeyCode } = monaco;
    ed.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, () => cb.current.onRun());
    ed.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter, () => cb.current.onCheck());
    ed.addCommand(KeyMod.Shift | KeyMod.Alt | KeyCode.KeyF, () => cb.current.onFormat());
    ed.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => cb.current.onFormat());
    return () => ed.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ed = editor.current;
    if (!ed) return;
    const m = modelFor(props.fileKey, props.initialValue);
    if (ed.getModel() !== m) {
      ed.setModel(m);
      cb.current.onChange(m.getValue());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fileKey]);

  useEffect(() => {
    editor.current?.updateOptions({ fontSize: props.fontSize });
  }, [props.fontSize]);

  useEffect(() => {
    const m = editor.current?.getModel();
    if (!m) return;
    monaco.editor.setModelMarkers(
      m,
      'rustc',
      props.diagnostics.map((d) => ({
        severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        message: d.code ? `${d.message} [${d.code}]` : d.message,
        startLineNumber: d.line,
        startColumn: d.col,
        endLineNumber: d.line,
        endColumn: m.getLineMaxColumn(Math.min(d.line, m.getLineCount())),
        source: 'rustc',
      })),
    );
  }, [props.diagnostics, props.fileKey]);

  useImperativeHandle(props.ref, () => ({
    setValue(v: string) {
      const ed = editor.current;
      const m = ed?.getModel();
      if (!ed || !m) return;
      // 用编辑操作而不是 setValue，这样重置之后还能 Ctrl+Z 撤销回来
      ed.pushUndoStop();
      ed.executeEdits('rustlab', [{ range: m.getFullModelRange(), text: v }]);
      ed.pushUndoStop();
    },
    getValue: () => editor.current?.getValue() ?? '',
    reveal(line: number, col: number) {
      const ed = editor.current;
      if (!ed) return;
      ed.revealLineInCenter(line);
      ed.setPosition({ lineNumber: line, column: col });
      ed.focus();
    },
    focus: () => editor.current?.focus(),
  }));

  return <div className="code-editor" ref={host} />;
}

/** 参考答案对比视图（左：你的代码，右：参考答案） */
export function DiffView({ original, modified, fontSize }: { original: string; modified: string; fontSize: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const diff = monaco.editor.createDiffEditor(host.current!, {
      automaticLayout: true,
      readOnly: true,
      originalEditable: false,
      renderSideBySide: host.current!.clientWidth > 700,
      fontSize,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });
    const a = monaco.editor.createModel(original, 'rust');
    const b = monaco.editor.createModel(modified, 'rust');
    diff.setModel({ original: a, modified: b });
    return () => {
      diff.dispose();
      a.dispose();
      b.dispose();
    };
  }, [original, modified, fontSize]);
  return <div className="diff-editor" ref={host} />;
}
