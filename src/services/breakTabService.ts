import * as vscode from 'vscode';

export class BreakTabService {
    private panel?: vscode.WebviewPanel;

    constructor(private context: vscode.ExtensionContext) {}

    public showBreakTab(): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Create webview panel as a tab
        this.panel = vscode.window.createWebviewPanel(
            'timeKeeperBreak',
            '☕ Break Time',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getBreakTabContent();

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        // Make it the active tab
        this.panel.reveal(vscode.ViewColumn.Active);
    }

    public hideBreakTab(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }

    public updateTimer(minutes: number, seconds: number): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateTimer',
                minutes,
                seconds
            });
            
            // Update tab title with timer
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            this.panel.title = `☕ Break Time - ${timeString}`;
        }
    }

    private getBreakTabContent(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Break Time</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    margin: 0;
                    padding: 40px;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }

                .container {
                    max-width: 600px;
                    animation: fadeIn 1s ease-in;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .coffee-icon {
                    font-size: 120px;
                    margin-bottom: 30px;
                    animation: steam 3s ease-in-out infinite;
                }

                @keyframes steam {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }

                h1 {
                    font-size: 48px;
                    font-weight: 300;
                    margin-bottom: 20px;
                    letter-spacing: 2px;
                }

                .timer {
                    font-size: 72px;
                    font-weight: 200;
                    margin-bottom: 40px;
                    font-variant-numeric: tabular-nums;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }

                .message {
                    font-size: 24px;
                    font-weight: 300;
                    opacity: 0.9;
                    margin-bottom: 40px;
                    line-height: 1.5;
                }

                .tip {
                    font-size: 18px;
                    opacity: 0.7;
                    font-style: italic;
                    line-height: 1.4;
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                    transition: opacity 0.3s;
                }

                .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 3px;
                    margin: 30px 0;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                    border-radius: 3px;
                    transition: width 1s linear;
                    width: 100%;
                }

                .emergency {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    font-size: 12px;
                    opacity: 0.5;
                    background: rgba(0,0,0,0.3);
                    padding: 10px;
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="coffee-icon">☕</div>
                <h1>Break Time!</h1>
                <div class="timer" id="timer">05:00</div>
                
                <div class="progress-bar">
                    <div class="progress-fill" id="progress"></div>
                </div>
                
                <div class="message">
                    Time to rest your eyes and stretch.<br>
                    Step away from your screen for a few minutes.
                </div>
                
                <div class="tip" id="tip">
                    💡 Tip: Look at something 20 feet away for 20 seconds to reduce eye strain.
                </div>
            </div>
            
            <div class="emergency">
                Emergency Unlock: Cmd+Shift+P → "Time Keeper: Emergency Unlock"
            </div>

            <script>
                const tips = [
                    "💡 Tip: Look at something 20 feet away for 20 seconds to reduce eye strain.",
                    "💪 Tip: Do some quick stretches - roll your shoulders and neck.",
                    "💧 Tip: Stay hydrated! Get a glass of water.",
                    "🚶 Tip: Take a short walk to improve circulation.",
                    "🧘 Tip: Try some deep breathing exercises to relax.",
                    "👀 Tip: Blink frequently to keep your eyes moist.",
                    "🪟 Tip: Look out the window and let natural light in.",
                    "🎵 Tip: Listen to calming music to help you relax.",
                    "🌱 Tip: Water your plants or look at some greenery."
                ];

                let currentTip = 0;
                const tipElement = document.getElementById('tip');
                
                // Rotate tips every 15 seconds
                setInterval(() => {
                    currentTip = (currentTip + 1) % tips.length;
                    tipElement.style.opacity = '0';
                    setTimeout(() => {
                        tipElement.textContent = tips[currentTip];
                        tipElement.style.opacity = '0.7';
                    }, 300);
                }, 15000);

                // Handle timer updates
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'updateTimer') {
                        const timerElement = document.getElementById('timer');
                        const progressElement = document.getElementById('progress');
                        
                        const minutes = String(message.minutes).padStart(2, '0');
                        const seconds = String(message.seconds).padStart(2, '0');
                        timerElement.textContent = minutes + ':' + seconds;
                        
                        // Update progress bar (assuming 5 minute break)
                        const totalSeconds = 5 * 60;
                        const remainingSeconds = message.minutes * 60 + message.seconds;
                        const percentage = (remainingSeconds / totalSeconds) * 100;
                        progressElement.style.width = percentage + '%';
                    }
                });
            </script>
        </body>
        </html>`;
    }

    public isVisible(): boolean {
        return this.panel !== undefined;
    }
}