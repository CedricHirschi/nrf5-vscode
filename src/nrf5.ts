import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as hardware from './hardware.json';
import * as commands from './commands.json';
import * as current from './extension';
import * as gui from './gui';
import { goBackPath } from './common';
import { exec } from 'child_process';
import { Configurator } from './config';

const hardwareNames = hardware.hardwareNames;
var projectButton: vscode.StatusBarItem | undefined = undefined;
var buildButton: vscode.StatusBarItem | undefined = undefined;
var flashButton: vscode.StatusBarItem | undefined = undefined;

// a class to store the project infos
export class Project {
    workspaceFolder: vscode.WorkspaceFolder | undefined;
    hardwareFolder: string | undefined;
    softdeviceFolder: string | undefined;
    emProjectFile: vscode.Uri | undefined;
    sdkPath: string | undefined;
    projectName: string | undefined;
    buildMode: string | undefined;
    properlyInitialized: boolean;

    constructor() {
        this.workspaceFolder = undefined;
        this.hardwareFolder = undefined;
        this.softdeviceFolder = undefined;
        this.emProjectFile = undefined;
        this.sdkPath = undefined;
        this.projectName = undefined;
        this.buildMode = undefined;
        this.properlyInitialized = false;
    }

    async getAllBuildModes() {
        // Returns all hardware/softdevice/buildmode combinations
        // Format: {
        //     hardware: {
        //         softdevice: [buildmodes]
        //     }
        // }

        const result: { [key: string]: any } = {};

        if (!this.workspaceFolder) {
            return result;
        }

        // get all folders starting with pca in the workspace folder
        const hardwareFolders = (await vscode.workspace.fs.readDirectory(this.workspaceFolder.uri)).filter((file) => file[1] === vscode.FileType.Directory && file[0].startsWith('pca'));
        if (hardwareFolders.length === 0) {
            return result;
        }

        for (const hardwareFolder of hardwareFolders) {
            // get all folders in the hardware folder
            const softdeviceFolders = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(this.workspaceFolder.uri, hardwareFolder[0]))).filter((file) => file[1] === vscode.FileType.Directory);
            if (softdeviceFolders.length === 0) {
                continue;
            }

            for (const softdeviceFolder of softdeviceFolders) {
                // get .emProject file
                const emProjectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(vscode.Uri.joinPath(this.workspaceFolder.uri, hardwareFolder[0], softdeviceFolder[0], 'ses'), '*.emProject'));
                if (emProjectFiles.length === 0) {
                    continue;
                }

                for (const emProjectFile of emProjectFiles) {
                    const buildModes = new Configurator(emProjectFile).init()?.getConfigs();
                    result[hardwareFolder[0]] = result[hardwareFolder[0]] || {};
                    result[hardwareFolder[0]][softdeviceFolder[0]] = buildModes!.map((buildMode: any) => buildMode.label);
                }
            }
        }

        return result;
    }

    // async refresh() {
    async refresh(device: string = "", softDevice: string = "", buildMode: string = "") {
        current.printer.open('project');

        this.workspaceFolder = undefined;
        this.hardwareFolder = undefined;
        this.softdeviceFolder = undefined;
        this.emProjectFile = undefined;
        this.projectName = undefined;
        this.buildMode = undefined;
        this.properlyInitialized = false;

        await this.refreshWorkspaceFolder();

        if (device !== "") {
            this.hardwareFolder = device;
        }
        else {
            await this.refreshHardwareFolder();
        }

        if (softDevice !== "") {
            this.softdeviceFolder = softDevice;
        }
        else {
            await this.refreshSoftdeviceFolder();
        }

        await this.refreshEmProjectFile();

        this.sdkPath = goBackPath(current.project.workspaceFolder!.uri.fsPath, 3);

        current.configurator.emProjectFile = this.emProjectFile!;
        current.configurator.init();

        await this.refreshProjectName();

        if (buildMode !== "") {
            this.buildMode = buildMode;
            current.configurator.setConfig(buildMode);
        }
        else {
            await this.refreshBuildMode();
        }

        gui.createButtons();
        gui.createViews();

        if (this.workspaceFolder && this.hardwareFolder && this.softdeviceFolder && this.emProjectFile && this.projectName && this.buildMode) {
            current.printer.print('Project properly initialized');
            this.properlyInitialized = true;

        }
        else {
            if (!this.workspaceFolder) {
                current.printer.print('Workspace folder not found');
            } else if (!this.hardwareFolder) {
                current.printer.print('Hardware folder not found');
            } else if (!this.softdeviceFolder) {
                current.printer.print('Softdevice folder not found');
            } else if (!this.emProjectFile) {
                current.printer.print('.emProject file not found');
            } else if (!this.projectName) {
                current.printer.print('Project name not found');
            } else if (!this.buildMode) {
                current.printer.print('Build mode not found');
            }
        }

        current.printer.close();

        vscode.window.showInformationMessage(`Project ${this.projectName} properly initialized for ${this.hardwareFolder} with SoftDevice ${this.softdeviceFolder} and build mode ${this.buildMode}`);

        return this;
    }

    async printInfo() {
        current.printer.open('info');

        if (!this.properlyInitialized) {
            await this.refresh();
        }
        if (!this.properlyInitialized) {
            return;
        }

        current.printer.open('project info');
        current.printer.print(this.toString());
        current.printer.close();
    }

    async refreshWorkspaceFolder() {
        if (vscode.workspace.workspaceFolders === undefined) {
            current.printer.print('No folder opened');
            return;
        }

        if (vscode.workspace.workspaceFolders!.length === 1) {
            this.workspaceFolder = vscode.workspace.workspaceFolders![0];
        }

        if (vscode.workspace.workspaceFolders!.findIndex((folder) => folder === this.workspaceFolder) !== -1) {
            return;
        }

        this.workspaceFolder = await vscode.window.showWorkspaceFolderPick();
    }

    async refreshHardwareFolder(choice: string = "") {
        if (!this.workspaceFolder) {
            return;
        }

        // get all folders starting with pca in the workspace folder
        const hardwareFolders = (await vscode.workspace.fs.readDirectory(this.workspaceFolder.uri)).filter((file) => file[1] === vscode.FileType.Directory && file[0].startsWith('pca'));
        if (hardwareFolders.length === 0) {
            current.printer.print('No hardware folder found');
            return;
        }

        // choose hardware folder
        if (!this.hardwareFolder) {
            if (hardwareFolders.length === 1) {
                this.hardwareFolder = hardwareFolders[0][0];
                return;
            }

            const quickPick = vscode.window.createQuickPick();
            quickPick.items = hardwareFolders.map((folder) => ({ label: folder[0], description: hardwareNames.find((hardware) => hardware.name === folder[0])?.description || '' }));
            quickPick.placeholder = 'Choose hardware';
            quickPick.onDidChangeSelection((selection) => {
                if (selection.length !== 1) {
                    return;
                }
                this.hardwareFolder = selection[0].label;
                quickPick.hide();
            });
            quickPick.show();
            await new Promise((resolve) => quickPick.onDidHide(resolve));
        }
    }

    async refreshSoftdeviceFolder() {
        if (!this.workspaceFolder || !this.hardwareFolder) {
            return;
        }

        // get all folders in the hardware folder
        const softdeviceFolders = (await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(this.workspaceFolder.uri, this.hardwareFolder))).filter((file) => file[1] === vscode.FileType.Directory);
        if (softdeviceFolders.length === 0) {
            current.printer.print('No softdevice folder found');
            return;
        }

        // choose softdevice folder
        if (!this.softdeviceFolder) {
            if (softdeviceFolders.length === 1) {
                this.softdeviceFolder = softdeviceFolders[0][0];
                return;
            }

            const quickPick = vscode.window.createQuickPick();
            quickPick.items = softdeviceFolders.map((folder) => ({ label: folder[0] }));
            quickPick.placeholder = 'Choose softdevice';
            quickPick.onDidChangeSelection((selection) => {
                if (selection.length !== 1) {
                    return;
                }
                this.softdeviceFolder = selection[0].label;
                quickPick.hide();
            });
            quickPick.show();
            await new Promise((resolve) => quickPick.onDidHide(resolve));
        }
    }

    async refreshEmProjectFile() {
        if (!this.workspaceFolder || !this.hardwareFolder || !this.softdeviceFolder) {
            return;
        }

        // get .emProject file
        const emProjectFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(vscode.Uri.joinPath(this.workspaceFolder.uri, this.hardwareFolder, this.softdeviceFolder, 'ses'), '*.emProject'));
        if (emProjectFiles.length === 0) {
            current.printer.print('No .emProject file found');
            return;
        }

        // choose .emProject file
        if (!this.emProjectFile) {
            if (emProjectFiles.length === 1) {
                this.emProjectFile = emProjectFiles[0];
                return;
            }

            const quickPick = vscode.window.createQuickPick();
            quickPick.items = emProjectFiles.map((file) => ({ label: file.fsPath }));
            quickPick.placeholder = 'Choose .emProject file';
            quickPick.onDidChangeSelection((selection) => {
                if (selection.length !== 1) {
                    return;
                }
                this.emProjectFile = vscode.Uri.file(selection[0].label);
                quickPick.hide();
            });
            quickPick.show();
            await new Promise((resolve) => quickPick.onDidHide(resolve));
        }
    }

    async refreshProjectName() {
        this.projectName = current.configurator.projectName;
    }

    async refreshBuildMode() {
        // choose build mode
        this.buildMode = await current.configurator.selectConfig();
    }

    // to string
    toString() {
        return `nRF5Project:   '${this.projectName}'
\tBuild mode: ${this.buildMode}
\tWorkspace:  ${this.workspaceFolder?.uri.fsPath}
\tHardware:   ${this.hardwareFolder}
\tSoftdevice: ${this.softdeviceFolder}
\t.emProject: ${this.emProjectFile?.fsPath}`;
    }
}

async function runCommand(commandKind: string, command: string, cwd: string, close: boolean = true): Promise<boolean> {
    // run command and show output in output channel
    // start execution of command
    // current.printer.print(`running ${commandKind} command: '${command}'`);
    const childProcess = exec(command, { cwd: cwd });
    childProcess.stdout?.on('data', (data) => {
        current.printer.print(data);
    });
    childProcess.stderr?.on('data', (data) => {
        current.printer.print(data);
    });
    var success = false;
    childProcess.on('close', (code) => {
        // current.printer.print(`${commandKind} command exited with code ${code}`);
        success = code === 0;
    });

    await new Promise((resolve) => childProcess.on('close', resolve));

    if (!success) {
        current.printer.print(`${commandKind} command failed`);
    }

    if (close) {
        current.printer.close();
    }

    return success;
}

export function replacePlaceholders(command: string) {

    const softdeviceDir = path.join(current.project.sdkPath!, 'components', 'softdevice', current.project.softdeviceFolder!, 'hex');
    var softdevice = '';
    if (fs.existsSync(softdeviceDir)) {
        // Get hex files in softdevice folder
        const softdeviceFiles = fs.readdirSync(softdeviceDir).filter((file) => file.endsWith('.hex'));
        softdevice = path.join(softdeviceDir, (softdeviceFiles as any)[0]);
    }

    const replacements = {
        'sesPath': current.sesPath,
        'emProjectFile': current.project.emProjectFile!.fsPath,
        'debugConfig': current.project.buildMode,
        'buildPath': path.join(current.project.workspaceFolder!.uri.fsPath, current.project.hardwareFolder!, current.project.softdeviceFolder!, 'ses', 'Output'),
        'projectName': current.project.projectName!,
        'sdkPath': current.project.sdkPath!,
        'deviceSVD': hardwareNames.find((device) => device.name === current.project.hardwareFolder!)?.svd || '',
        'softdevice': softdevice
    };

    for (const [key, value] of Object.entries(replacements)) {
        command = command.replace(`<${key}>`, value!);
    }
    return command;
}

export class Builder {
    constructor() {
    }

    async build(): Promise<boolean> {
        current.printer.open('build');

        if (!current.project.properlyInitialized) {
            await current.project.refresh();
        }
        if (!current.project.properlyInitialized) {
            current.printer.print('Project not properly initialized');
            return false;
        }

        current.printer.print('Building project');

        // execute build command from commands.json
        const buildCommand = replacePlaceholders(commands.build);
        return runCommand("build", buildCommand, current.project.workspaceFolder!.uri.fsPath);
    }

    async clean(): Promise<boolean> {
        current.printer.open('clean');

        if (!current.project.properlyInitialized) {
            await current.project.refresh();
        }
        if (!current.project.properlyInitialized) {
            current.printer.print('Project not properly initialized');
            return false;
        }

        current.printer.print('Cleaning project');

        // execute clean command from commands.json
        const cleanCommand = replacePlaceholders(commands.clean);
        return runCommand("clean", cleanCommand, current.project.workspaceFolder!.uri.fsPath);
    }

    async flash(): Promise<boolean> {
        current.printer.open('flash');

        var success = await this.build();
        if (!success) {
            current.printer.print('Cant flash because build failed');
            return false;
        }

        if (!current.project.properlyInitialized) {
            await current.project.refresh();
        }
        if (!current.project.properlyInitialized) {
            current.printer.print('Project not properly initialized');
            return false;
        }

        current.printer.print('Flashing project');

        // execute flash command from commands.json
        const flashCommand = replacePlaceholders(commands.flash);
        success = await runCommand("flash", flashCommand, current.project.workspaceFolder!.uri.fsPath, false);
        if (!success) {
            // try recovering and flashing again
            const recoverCommand = replacePlaceholders(commands.recover);
            current.printer.print('Flash failed, trying to recover');
            success = await runCommand("recover", recoverCommand, current.project.workspaceFolder!.uri.fsPath);
            if (!success) {
                current.printer.print('Flash failed: Could not recover');
                return false;
            }
            current.printer.print('Recover successful, flashing again');
            success = await runCommand("flash", flashCommand, current.project.workspaceFolder!.uri.fsPath);
            if (!success) {
                current.printer.print('Flash failed: Could not flash after recovering');
            }
        }

        current.printer.close();

        return success;
    }

    async recover(): Promise<boolean> {
        current.printer.open('recover');

        // execute recover command from commands.json
        const recoverCommand = replacePlaceholders(commands.recover);
        var result = await runCommand("recover", recoverCommand, current.project.workspaceFolder!.uri.fsPath, false);
        if (!result) {
            current.printer.print('Recovery failed');
            return result;
        }



        if (current.project.softdeviceFolder?.startsWith('s')) {
            current.printer.print('Recovery successful, flashing softdevice');
            // execute softdevice command from commands.json
            const softdeviceCommand = replacePlaceholders(commands.softdevice);
            console.log(softdeviceCommand);
            result = await runCommand("softdevice", softdeviceCommand, current.project.workspaceFolder!.uri.fsPath, false);
            if (!result) {
                current.printer.print('Recovery failed: Could not flash softdevice');
            } else {
                current.printer.print('Softdevice flashed successfuly');
            }
        } else {
            current.printer.print('Recovery successful');
        }

        current.printer.close();

        return result;
    }
}