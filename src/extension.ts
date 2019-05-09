// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import * as vscode_languageclient from 'vscode-languageclient';
import { commands, window } from 'vscode';
import * as treeProvider from './treeProvider';
import { DBTreeDataProvider } from './treeProvider';

const LANGUAGE_CLIENT_ID = 'PLSQL';
const LANGUAGE_CLIENT_NAME = 'PLSQL Language Client';
const EXTENSION_START_MSG = 'PLSQL Language Client Extension started';
const LANGUAGE_CLIENT_READY_MSG = 'PL/SQL language client and server are ready';
const LANGUAGE_CLIENT_JAVA_WARNING = 'Failure to initialize language server: the PL/SQL language server requires JDK 1.8 set in the JAVA_HOME or the plsql-lsp.javaHome VSCode setting';
const LANGUAGE_CLIENT_JAVA_INVALID_VERSION = 'Invalid JDK version';
const LANGUAGE_CLIENT_JAVA_VSCODE_SETTING_NULL = 'plsql-lsp.javaHome VSCode setting is not set';
const LANGUAGE_CLIENT_JAVA_START_PATH = 'Starting language server with java path: ';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log(EXTENSION_START_MSG);
  // ibm-xml-
  let serverJarPath = context.asAbsolutePath(path.join('server', 'server-all.jar'));
  // let serverJarPath = context.asAbsolutePath(path.join('server', 'server-all.jar'));
  console.log(serverJarPath);

  // 1. Check if the VSCode settings has defined the "xmlLang.javaHome" property. If the user
  // has not specified it in the workspace, it will look at the global settings after
  // 2. If the VSCode setting is not defined, use the JAVA_HOME argument
  // 3. If neither of the two properties above are set, show a message to the user
  javaVerifierPromise(vscode.workspace.getConfiguration().get('plsql-lsp.javaHome')).then(
    function (res) {
      context.subscriptions.push(initLangClient(serverJarPath, res.toString()).start());
    }
  ).catch(function (rej) {
    console.log(rej);

    javaVerifierPromise(process.env['JAVA_HOME']).then(
      function (res) {
        let disposable = initLangClient(serverJarPath, res.toString()).start();
        context.subscriptions.push(disposable);
      }
    ).catch(function (rej) {
      console.log(rej);

      vscode.window.showWarningMessage(LANGUAGE_CLIENT_JAVA_WARNING);
    });
  });
  // // Use the console to output diagnostic information (console.log) and errors (console.error)
  // // This line of code will only be executed once when your extension is activated
  // console.log('Congratulations, your extension "plsql-lsp" is now active!');

  // // The command has been defined in the package.json file
  // // Now provide the implementation of the command with registerCommand
  // // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
  // 	// The code you place here will be executed every time your command is executed

  // 	// Display a message box to the user
  // 	vscode.window.showInformationMessage('Hello World!');
  // });

  // context.subscriptions.push(disposable);
}

function initLangClient(serverJarPath: string, javaPath: string) {
  console.log(LANGUAGE_CLIENT_JAVA_START_PATH + javaPath);

  // Create the client options used for the vscode_languageclient.LanguageClient
  let clientOptions = {

    documentSelector: [
      { scheme: 'file', language: 'plsql' }
    ],
    synchronize: {
      // The configurationSection needs to match the configuration definition in
      // the package.json
      configurationSection: 'plsql-lsp',
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.sql')
    }
  };

  // Create the server options used for the vscode_languageclient.LanguageClient
  // Note: the server will be started by the client
  let serverOptions = {
    command: javaPath,
    args: ['-jar', serverJarPath],
    options: { stdio: 'pipe' }
  };

  let langClient = new vscode_languageclient.LanguageClient(LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME, serverOptions, clientOptions, true);

  // langClient.on

  // langClient.onReady().then(function () {
  //    console.log(LANGUAGE_CLIENT_READY_MSG);
  //    console.log(langClient);
  //    // langClient.onNotification('textDocument/didOpen',);
  // });


  let item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
  item.text = 'Starting PL/SQL Language Server...';
  toggleItem(vscode.window.activeTextEditor, item);

  langClient.onReady().then(() => {
    console.log(LANGUAGE_CLIENT_READY_MSG);

    item.text = LANGUAGE_CLIENT_READY_MSG;
    toggleItem(vscode.window.activeTextEditor, item);

    window.onDidChangeActiveTextEditor((editor) => {
      toggleItem(editor, item);
    });

    // langClient.sendRequest('getTree', 'biss_dev2/biss@biss').then((e) => {
    //    console.log(e);
    // });
    console.log("before DBTreeDataProvider");

    let treeDataProvider = new DBTreeDataProvider(langClient);
    vscode.window.createTreeView('dbObjects', { treeDataProvider });
    console.log("after createTreeView");
    // context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('ftp', treeDataProvider));

  });



  return langClient;
}


function toggleItem(editor: vscode.TextEditor | undefined, item: vscode.StatusBarItem) {
  if (editor && editor.document &&
    (editor.document.languageId === 'sql' || editor.document.languageId === 'plsql')) {
    item.show();
  } else {
    item.hide();
  }
}

function javaVerifierPromise(testPath: string | undefined) {
  return new Promise(function (resolve, reject) {
    if (!testPath) {
      reject(LANGUAGE_CLIENT_JAVA_VSCODE_SETTING_NULL);
    }
    else {
      let pathToJavaExec = testPath + '/bin/java';
      cp.execFile(pathToJavaExec, ['-version'], {}, function (error, stdout, stderr) {
        if (error) {
          reject(error);
        }
        if (stderr) {
          if (stderr.indexOf('1.8') >= 0) {
            resolve(pathToJavaExec);
          }
          else {
            reject(LANGUAGE_CLIENT_JAVA_INVALID_VERSION);
          }
        }
      });
    }
  });
}
// this method is called when your extension is deactivated
export function deactivate() { }
