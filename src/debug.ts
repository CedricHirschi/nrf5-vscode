import * as vscode from 'vscode';
import * as tasks from './tasks';

export class Printer {
    outputChannel: vscode.OutputChannel;
    methods: string[];
    level: number;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('nRF5 SDK', 'log');
        this.methods = [];
        this.level = 0;
    }

    open(method: string, clear: boolean = true, reveal: boolean = true) {
        if (clear) {
            this.outputChannel.clear();
        }
        if (reveal) {
            this.outputChannel.show(true);
        }
        this.methods.push(method);
        this.level++;
    }

    print(message: string) {
        // print with last method as [method] prefix and 2 * level spaces
        let prefix = this.methods[this.methods.length - 1];
        prefix = '[' + prefix + ']' + ' '.repeat(Math.max(0, 7 - prefix.length));
        let spaces = '  '.repeat(this.level);
        const lines = message.split('\r').map(line => line.trim()).filter(line => line !== '');
        for (let line of lines) {
            if (line.trim() !== '') {
                if (tasks.writeEmitter !== undefined) {
                    tasks.writeEmitter.fire(`${line.trim()}\n\r`);
                }
                this.outputChannel.appendLine(`${prefix}${spaces}${line.trim()}`);
            }
        }
    }

    close() {
        this.methods.pop();
        this.level--;
    }
}