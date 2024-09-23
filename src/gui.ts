import * as vscode from 'vscode';
import * as current from './extension';
import * as hardware from './hardware.json';

export var createdButtons: boolean = false;
// export var projectButton: vscode.StatusBarItem;
export var buildButton: vscode.StatusBarItem;
export var flashButton: vscode.StatusBarItem;
export var debugButton: vscode.StatusBarItem;

export function createButtons() {
    if (!createdButtons) {
        // projectButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        // projectButton.command = 'nrf5-vscode.choose-project';
        // projectButton.text = '$(list-selection) Build type';
        // projectButton.tooltip = 'Select build type';
        // projectButton.show();

        buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        buildButton.command = 'nrf5-vscode.build';
        // gear icon
        buildButton.text = '$(gear) Build';
        buildButton.tooltip = 'Build project';
        buildButton.show();

        flashButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
        flashButton.command = 'nrf5-vscode.flash';
        // flash icon
        flashButton.text = '$(plug) Flash';
        flashButton.tooltip = 'Flash project';
        flashButton.show();

        debugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
        debugButton.command = 'nrf5-vscode.start-debug-session';
        // bug icon
        debugButton.text = '$(bug) Debug';
        debugButton.tooltip = 'Start debug session';
        debugButton.show();

        createdButtons = true;
    }
}

// interface Hardware {
//     description: string;
//     name: string;
//     jlink: string;
//     svd: string;
// }

// class HardwareProvider implements vscode.TreeDataProvider<Hardware> {
//     getTreeItem(element: Hardware): vscode.TreeItem {
//         return {
//             label: element.description,
//             collapsibleState: vscode.TreeItemCollapsibleState.None,
//             tooltip: element.name,
//             command: {
//                 command: 'nrf5-vscode.choose-project',
//                 title: 'Select hardware',
//                 arguments: [element.name]
//             }
//         };
//     }

//     getChildren(element?: Hardware): Thenable<Hardware[]> {
//         return Promise.resolve(hardware.hardwareNames);
//     }
// }

// export function createViews() {
//     // There is a view container called 'nrf5-vscode' in the activity bar
//     // There are two views in this container:
//     // - 'nrf5-vscode-hardware' showing the list of hardware for the current project (pca10040, pca10056, etc.)
//     // - 'nrf5-vscode-activities' showing the list of activities (build, flash, debug, etc.)
//     // This function initializes a data provider for each view and registers them
//     // with the view container
//     vscode.window.registerTreeDataProvider('nrf5-vscode-hardware', new HardwareProvider());
// }



// interface Hardware {
//     description: string;
//     name: string;
//     jlink?: string;
//     svd?: string;
//     type: 'device' | 'buildMode' | 'category';
//     children?: Hardware[];
// }

// class HardwareProvider implements vscode.TreeDataProvider<Hardware> {
//     private hardwareItems: Hardware[] = [
//         {
//             description: 'Devices',
//             name: 'Devices',
//             type: 'category',
//             children: [
//                 { description: 'PCA10040', name: 'pca10040', type: 'device' },
//                 { description: 'PCA10056', name: 'pca10056', type: 'device' }
//             ]
//         },
//         {
//             description: 'Build Modes',
//             name: 'Build Modes',
//             type: 'category',
//             children: [
//                 { description: 'Release', name: 'Release', type: 'buildMode' },
//                 { description: 'Debug', name: 'Debug', type: 'buildMode' }
//             ]
//         }
//     ];

//     getTreeItem(element: Hardware): vscode.TreeItem {
//         const treeItem = new vscode.TreeItem(element.description,
//             element.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

//         treeItem.tooltip = element.name;
//         treeItem.command = element.type === 'device' || element.type === 'buildMode' ? {
//             command: 'nrf5-vscode.choose-project',
//             title: 'Select hardware',
//             arguments: [element.name]
//         } : undefined;

//         return treeItem;
//     }

//     getChildren(element?: Hardware): Thenable<Hardware[]> {
//         if (element === undefined) {
//             current.project.getAllBuildModes().then((buildModes) => {
//                 console.log(buildModes);
//             });
//             return Promise.resolve(this.hardwareItems);
//         }
//         return Promise.resolve(element.children || []);
//     }
// }

// export function createViews() {
//     vscode.window.registerTreeDataProvider('nrf5-vscode-hardware', new HardwareProvider());
// }



interface Hardware {
    description: string;
    name: string;
    jlink?: string;
    svd?: string;
    type: 'device' | 'buildMode' | 'category' | 'softdevice';
    children?: Hardware[];
    arguments?: any[];
}

class HardwareProvider implements vscode.TreeDataProvider<Hardware> {
    private hardwareItems: Hardware[] = [];

    async init() {
        const buildModesData = await current.project.getAllBuildModes();
        this.hardwareItems = this.transformDataToTreeItems(buildModesData);

        return this;
    }

    private transformDataToTreeItems(buildModesData: any): Hardware[] {
        const hardwareItems: Hardware[] = [];

        for (const hardwareName in buildModesData) {
            const softdevices = buildModesData[hardwareName];
            const softdeviceItems: Hardware[] = [];

            for (const softdeviceName in softdevices) {
                const buildModes = softdevices[softdeviceName];
                const buildModeItems: Hardware[] = buildModes.map((mode: string) => ({
                    description: mode,
                    name: mode,
                    type: 'buildMode',
                    arguments: [{ device: hardwareName, softDevice: softdeviceName, buildMode: mode }]
                }));

                softdeviceItems.push({
                    description: softdeviceName,
                    name: softdeviceName,
                    type: 'softdevice',
                    children: buildModeItems
                });
            }

            hardwareItems.push({
                description: hardwareName,
                name: hardwareName,
                type: 'device',
                children: softdeviceItems
            });
        }

        return hardwareItems;
    }

    getTreeItem(element: Hardware): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            element.description,
            element.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );

        treeItem.tooltip = element.name;
        if (element.type === 'buildMode') {
            treeItem.command = {
                command: 'nrf5-vscode.choose-project',
                title: 'Select build mode',
                arguments: element.arguments
            };
        }

        return treeItem;
    }

    getChildren(element?: Hardware): Thenable<Hardware[]> {
        if (element === undefined) {
            return Promise.resolve(this.hardwareItems);
        }
        return Promise.resolve(element.children || []);
    }
}

interface Command {
    command: string;
    title: string;
    description?: string;
    icon?: string;
}

class CommandProvider implements vscode.TreeDataProvider<Command> {
    private commandItems: Command[] = [
        { command: 'nrf5-vscode.build', title: 'Build', description: 'Build the project', icon: 'gear' },
        { command: 'nrf5-vscode.clean', title: 'Clean', description: 'Clean the project', icon: 'trash' },
        { command: 'nrf5-vscode.flash', title: 'Flash', description: 'Flash the project', icon: 'plug' },
        { command: 'nrf5-vscode.recover', title: 'Recover', description: 'Recover the device', icon: 'sync' },
        { command: 'nrf5-vscode.start-debug-session', title: 'Debug', description: 'Start debug session', icon: 'bug' }
    ];

    getTreeItem(element: Command): vscode.TreeItem {
        return {
            iconPath: new vscode.ThemeIcon(element.icon || ''),
            label: element.title,
            tooltip: element.description,
            description: element.description,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: element.command,
                title: element.title
            }
        };
    }

    getChildren(element?: Command): Thenable<Command[]> {
        return Promise.resolve(this.commandItems);
    }
}

export async function createViews() {
    vscode.window.registerTreeDataProvider('nrf5-vscode-hardware', await new HardwareProvider().init());
    vscode.window.registerTreeDataProvider('nrf5-vscode-activities', new CommandProvider());
}
