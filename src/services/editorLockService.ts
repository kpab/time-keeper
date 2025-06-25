import * as vscode from 'vscode';

export class EditorLockService {
    private disposables: vscode.Disposable[] = [];
    private isLocked: boolean = false;
    private originalEditableStates: Map<vscode.TextDocument, boolean> = new Map();

    public lock(): void {
        if (this.isLocked) return;
        
        this.isLocked = true;
        
        // Make all open text editors read-only
        vscode.window.visibleTextEditors.forEach(editor => {
            this.makeEditorReadOnly(editor);
        });

        // Intercept all text document changes
        const changeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isLocked && !event.document.isUntitled) {
                // This will be blocked by read-only status, but we can show a message
                vscode.window.showWarningMessage('Editor is locked during break time!');
            }
        });
        this.disposables.push(changeDisposable);

        // Monitor newly opened editors
        const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && this.isLocked) {
                this.makeEditorReadOnly(editor);
            }
        });
        this.disposables.push(editorChangeDisposable);

        // Block command execution during lock
        const commandDisposables = this.blockCommands();
        this.disposables.push(...commandDisposables);
    }

    public unlock(): void {
        if (!this.isLocked) return;
        
        this.isLocked = false;
        
        // Restore all editors
        vscode.window.visibleTextEditors.forEach(editor => {
            this.restoreEditorState(editor);
        });

        // Clear all disposables
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.originalEditableStates.clear();
    }

    private makeEditorReadOnly(editor: vscode.TextEditor): void {
        // VSCode doesn't have a direct way to make editors read-only
        // We'll use a workaround by intercepting edits
        const document = editor.document;
        
        // Store original state (for future enhancement)
        if (!this.originalEditableStates.has(document)) {
            this.originalEditableStates.set(document, true);
        }

        // Set editor options to discourage editing
        editor.options = {
            ...editor.options,
            cursorStyle: vscode.TextEditorCursorStyle.Underline,
            lineNumbers: vscode.TextEditorLineNumbersStyle.Off
        };

        // Make the editor less prominent
        vscode.window.showTextDocument(document, {
            preview: true,
            preserveFocus: false,
            viewColumn: editor.viewColumn
        });
    }

    private restoreEditorState(editor: vscode.TextEditor): void {
        // Restore normal editor options
        editor.options = {
            ...editor.options,
            cursorStyle: vscode.TextEditorCursorStyle.Line,
            lineNumbers: vscode.TextEditorLineNumbersStyle.On
        };
    }

    private blockCommands(): vscode.Disposable[] {
        const disposables: vscode.Disposable[] = [];
        
        // List of editing commands to block
        const blockedCommands = [
            'type',
            'paste',
            'cut',
            'deleteLeft',
            'deleteRight',
            'deleteWordLeft', 
            'deleteWordRight',
            'editor.action.deleteLines',
            'editor.action.insertLineAfter',
            'editor.action.insertLineBefore',
            'undo',
            'redo'
        ];

        // Intercept these commands
        blockedCommands.forEach(command => {
            const disposable = vscode.commands.registerCommand(command, () => {
                if (this.isLocked) {
                    vscode.window.showErrorMessage('Cannot edit during break time!');
                    return;
                }
                // If not locked, execute the original command
                return vscode.commands.executeCommand(`default:${command}`);
            });
            disposables.push(disposable);
        });

        return disposables;
    }

    public isCurrentlyLocked(): boolean {
        return this.isLocked;
    }
}