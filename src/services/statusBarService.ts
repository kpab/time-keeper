import * as vscode from 'vscode';

export class StatusBarService {
    private statusBarItem: vscode.StatusBarItem;
    private menuStatusBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        console.log('StatusBarService: Creating status bar items');
        
        // Main timer status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'timeKeeper.quickToggle';
        this.statusBarItem.text = '⏰ Start Timer';
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);

        // Menu trigger status bar item (for settings)
        this.menuStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        this.menuStatusBarItem.text = '⚙️';
        this.menuStatusBarItem.command = 'timeKeeper.showMenu';
        this.menuStatusBarItem.tooltip = 'Timer Settings';
        this.menuStatusBarItem.show();
        context.subscriptions.push(this.menuStatusBarItem);
        
        console.log('StatusBarService: Status bar items created and shown');
    }

    public updateTimer(text: string, tooltip: string, isRunning: boolean): void {
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.show();
        
        // Show/hide menu item based on timer state
        if (isRunning) {
            this.menuStatusBarItem.hide();
        } else {
            this.menuStatusBarItem.show();
        }
    }

    public getStatusBarItem(): vscode.StatusBarItem {
        return this.statusBarItem;
    }
}