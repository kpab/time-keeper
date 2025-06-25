import * as vscode from 'vscode';
import { TimerService } from './services/timerService';
import { EditorLockService } from './services/editorLockService';
import { OverlayService } from './services/overlayService';
import { SyncService } from './services/syncService';

let timerService: TimerService;
let editorLockService: EditorLockService;
let overlayService: OverlayService;
let syncService: SyncService;

export function activate(context: vscode.ExtensionContext) {
    console.log('Time Keeper extension is now active!');

    // Initialize services
    timerService = new TimerService(context);
    editorLockService = new EditorLockService();
    overlayService = new OverlayService(context);
    syncService = new SyncService(context);
    
    // Initialize timer UI
    timerService.initialize();

    // Register commands
    const startCommand = vscode.commands.registerCommand('timeKeeper.start', () => {
        timerService.start();
    });

    const stopCommand = vscode.commands.registerCommand('timeKeeper.stop', () => {
        timerService.stop();
    });
    
    const quickToggleCommand = vscode.commands.registerCommand('timeKeeper.quickToggle', () => {
        timerService.toggle();
    });

    const showMenuCommand = vscode.commands.registerCommand('timeKeeper.showMenu', async () => {
        // Show quick pick menu
        const action = await vscode.window.showQuickPick([
            '⏱️ Set Work Duration',
            '☕ Set Break Duration',
            '🔄 Reset to Defaults',
            '⚙️ Open Settings'
        ], {
            placeHolder: 'Timer Settings'
        });

        if (!action) return;

        if (action.includes('Work Duration')) {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter work duration in minutes',
                value: String(vscode.workspace.getConfiguration('timeKeeper').get<number>('workDuration', 25)),
                validateInput: (value) => {
                    const num = Number(value);
                    if (isNaN(num) || num <= 0) {
                        return 'Please enter a positive number';
                    }
                    return null;
                }
            });
            if (input) {
                await vscode.workspace.getConfiguration('timeKeeper').update('workDuration', Number(input), true);
                vscode.window.showInformationMessage(`Work duration set to ${input} minutes`);
            }
        } else if (action.includes('Break Duration')) {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter break duration in minutes',
                value: String(vscode.workspace.getConfiguration('timeKeeper').get<number>('breakDuration', 5)),
                validateInput: (value) => {
                    const num = Number(value);
                    if (isNaN(num) || num <= 0) {
                        return 'Please enter a positive number';
                    }
                    return null;
                }
            });
            if (input) {
                await vscode.workspace.getConfiguration('timeKeeper').update('breakDuration', Number(input), true);
                vscode.window.showInformationMessage(`Break duration set to ${input} minutes`);
            }
        } else if (action.includes('Reset')) {
            await vscode.workspace.getConfiguration('timeKeeper').update('workDuration', 25, true);
            await vscode.workspace.getConfiguration('timeKeeper').update('breakDuration', 5, true);
            vscode.window.showInformationMessage('Timer settings reset to defaults');
        } else if (action.includes('Open Settings')) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'timeKeeper');
        }
    });

    const emergencyUnlockCommand = vscode.commands.registerCommand('timeKeeper.emergencyUnlock', () => {
        vscode.window.showWarningMessage('Emergency unlock activated! Timer stopped.', 'OK');
        timerService.stop();
        editorLockService.unlock();
        overlayService.hide();
    });

    // Subscribe to timer events
    timerService.onWorkComplete(() => {
        editorLockService.lock();
        overlayService.show();
        const timeInfo = timerService.getRemainingTime();
        syncService.broadcastState('break', timeInfo.minutes * 60 + timeInfo.seconds);
    });

    timerService.onBreakComplete(() => {
        editorLockService.unlock();
        overlayService.hide();
        syncService.broadcastState('idle');
        vscode.window.showInformationMessage('Break time is over! Ready to work?', 'Start Timer').then(selection => {
            if (selection === 'Start Timer') {
                timerService.start();
            }
        });
    });

    // Update overlay timer display
    setInterval(() => {
        if (timerService.isActive()) {
            const timeInfo = timerService.getRemainingTime();
            overlayService.updateTimer(timeInfo.minutes, timeInfo.seconds);
        }
    }, 1000);

    // Listen for sync events from other windows
    syncService.onStateChange((state) => {
        if (state === 'break') {
            editorLockService.lock();
            overlayService.show();
        } else if (state === 'work') {
            editorLockService.unlock();
            overlayService.hide();
        }
    });

    context.subscriptions.push(startCommand, stopCommand, quickToggleCommand, showMenuCommand, emergencyUnlockCommand);
}

export function deactivate() {
    if (timerService) {
        timerService.stop();
    }
    if (editorLockService) {
        editorLockService.unlock();
    }
    if (overlayService) {
        overlayService.hide();
    }
    if (syncService) {
        syncService.dispose();
    }
}