// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as nRF5 from './nrf5';
import * as debug from './debug';
import * as tasks from './tasks';
import * as config from './config';
import * as launch from './launch';
import * as locator from './locator';

export var project = new nRF5.Project();
export var builder = new nRF5.Builder();
export var printer = new debug.Printer();
export var taskProvider = new tasks.TaskProvider();
export var configurator = new config.Configurator();
export var launcher = new launch.Launcher(project);

export var sesPath = vscode.workspace.getConfiguration('nrf5-vscode').get('seggerEmbeddedStudioPath') as string;
export var jLinkPath = vscode.workspace.getConfiguration('nrf5-vscode').get('jLinkPath') as string;
export var tempPaths = vscode.workspace.getConfiguration('nrf5-vscode').get('tempPaths') as boolean;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "nrf5-vscode" is now active!');

	if (sesPath === "") {
		sesPath = locator.findSES();

		if (sesPath === "") {
			const message = "SEGGER Embedded Studio not found. Please specify the path to the installation folder.";
			const action = "Specify path";
			const result = await vscode.window.showErrorMessage(message, action);

			if (result === action) {
				// const options: vscode.InputBoxOptions = {
				// 	placeHolder: "Path to SEGGER Embedded Studio",
				// 	prompt: "Please specify the path to the installation folder of SEGGER Embedded Studio."
				// };

				// const path = await vscode.window.showInputBox(options);

				const options: vscode.OpenDialogOptions = {
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					openLabel: "Select SES directory"
				};

				const path = await vscode.window.showOpenDialog(options);
				if (path !== undefined) {
					sesPath = path[0].fsPath;
				}
			}
		} else {
			const message = "SEGGER Embedded Studio found at " + sesPath;
			const action = "Use this path";
			const result = await vscode.window.showInformationMessage(message, action);

			if (result !== action) {
				// const options: vscode.InputBoxOptions = {
				// 	placeHolder: "Path to SEGGER Embedded Studio",
				// 	prompt: "Please specify the path to the installation folder of SEGGER Embedded Studio."
				// };

				// const path = await vscode.window.showInputBox(options);

				const options: vscode.OpenDialogOptions = {
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					openLabel: "Select SES directory",
					title: "Select Segger Embedded Studio base directory"
				};

				const path = await vscode.window.showOpenDialog(options);
				if (path !== undefined) {
					sesPath = path[0].fsPath;
				}
			}
		}

		vscode.workspace.getConfiguration('nrf5-vscode').update('seggerEmbeddedStudioPath', sesPath);
	}

	if (jLinkPath === "") {
		jLinkPath = locator.findJLink();

		if (jLinkPath === "") {
			const message = "J-Link not found. Please specify the path to the installation folder.";
			const action = "Specify path";
			const result = await vscode.window.showErrorMessage(message, action);

			if (result === action) {
				// const options: vscode.InputBoxOptions = {
				// 	placeHolder: "Path to J-Link",
				// 	prompt: "Please specify the path to the installation folder of J-Link."
				// };

				// const path = await vscode.window.showInputBox(options);

				const options: vscode.OpenDialogOptions = {
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					openLabel: "Select JLink directory",
					title: "Select JLink base directory"
				};

				const path = await vscode.window.showOpenDialog(options);
				if (path !== undefined) {
					jLinkPath = path[0].fsPath;
				}
			}
		} else {
			const message = "J-Link found at " + jLinkPath;
			const action = "Use this path";
			const result = await vscode.window.showInformationMessage(message, action);

			if (result !== action) {
				// const options: vscode.InputBoxOptions = {
				// 	placeHolder: "Path to J-Link",
				// 	prompt: "Please specify the path to the installation folder of J-Link."
				// };

				// const path = await vscode.window.showInputBox(options);

				const options: vscode.OpenDialogOptions = {
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					openLabel: "Select JLink directory"
				};

				const path = await vscode.window.showOpenDialog(options);
				if (path !== undefined) {
					jLinkPath = path[0].fsPath;
				}
			}
		}

		vscode.workspace.getConfiguration('nrf5-vscode').update('jLinkPath', jLinkPath);
	}

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.tasks.registerTaskProvider('nrf5-vscode', taskProvider);
	context.subscriptions.push(disposable);
	taskProvider.provideTasks();
	disposable = vscode.commands.registerCommand('nrf5-vscode.project-info', project.printInfo.bind(project));
	context.subscriptions.push(disposable);
	// disposable = vscode.commands.registerCommand('nrf5-vscode.choose-project', project.refresh.bind(project));
	disposable = vscode.commands.registerCommand('nrf5-vscode.choose-project', (parameters: any) => project.refresh(parameters.device, parameters.softDevice, parameters.buildMode));
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('nrf5-vscode.build', tasks.build.bind(tasks));
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('nrf5-vscode.clean', builder.clean.bind(builder).bind(project));
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('nrf5-vscode.flash', tasks.flash.bind(tasks));
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('nrf5-vscode.recover', builder.recover.bind(builder));
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('nrf5-vscode.start-debug-session', launcher.start.bind(launcher));
	context.subscriptions.push(disposable);

	// Choose the project
	project.refresh();
}

// This method is called when your extension is deactivated
export function deactivate() {

	// This makes sure that the temporary .emProject file is deleted
	configurator.deinit();

}
