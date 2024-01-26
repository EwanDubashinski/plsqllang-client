// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import * as vscode_languageclient from 'vscode-languageclient/node';
import { commands, window } from 'vscode';

const LANGUAGE_CLIENT_ID = 'PLSQL';
const LANGUAGE_CLIENT_NAME = 'PL/SQL Linter';
const EXTENSION_START_MSG = 'PL/SQL Linter started';
const LANGUAGE_CLIENT_STARTING_MSG = 'Starting PL/SQL Language Server...';
const LANGUAGE_CLIENT_READY_MSG = 'PL/SQL language client and server are ready';
const LANGUAGE_CLIENT_JAVA_WARNING = 'Failure to initialize language server: the PL/SQL language server requires JDK 1.8 or higher set in the JAVA_HOME or the plsqllint.javaHome VSCode setting';
const LANGUAGE_CLIENT_JAVA_INVALID_VERSION = 'Invalid JDK version';
const LANGUAGE_CLIENT_JAVA_VSCODE_SETTING_NULL = 'plsqllint.javaHome VSCode setting is not set';
const LANGUAGE_CLIENT_JAVA_START_PATH = 'Starting language server with java path: ';

let langClient: vscode_languageclient.LanguageClient;
let activeConnection: string;
let output: vscode.OutputChannel;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  output = window.createOutputChannel(LANGUAGE_CLIENT_NAME);
  console.log(EXTENSION_START_MSG);
  let serverJarPath = context.asAbsolutePath(path.join('server', 'server-all.jar'));
  // let serverJarPath = context.asAbsolutePath(path.join('server', 'server-all.jar'));
  console.log(serverJarPath);

  // 1. Check if the VSCode settings has defined the "xmlLang.javaHome" property. If the user
  // has not specified it in the workspace, it will look at the global settings after
  // 2. If the VSCode setting is not defined, use the JAVA_HOME argument
  // 3. If neither of the two properties above are set, show a message to the user
  try {
    const res = await javaVerifierPromise(vscode.workspace.getConfiguration().get('plsqllint.javaHome'))
    initLangClient(serverJarPath, res);
  } catch (e: any) {
    output.appendLine(e);
    javaVerifierPromise(process.env['JAVA_HOME']).then(
      async function (res: any) {
    initLangClient(serverJarPath, res.toString());
        await langClient.start();
        langClient.onTelemetry((e) => {
          output.appendLine(e);
        });
        output.appendLine(LANGUAGE_CLIENT_READY_MSG);
      }
    ).catch(function (rej) {
      output.appendLine(rej);

      vscode.window.showWarningMessage(LANGUAGE_CLIENT_JAVA_WARNING);
    });
  }
}

async function initLangClient(serverJarPath: string, javaPath: string) {
  console.log(LANGUAGE_CLIENT_JAVA_START_PATH + javaPath);

  // Create the client options used for the vscode_languageclient.LanguageClient
  let clientOptions = {

    documentSelector: [
      { scheme: 'file', language: 'plsql' }
    ],
    synchronize: {
      // The configurationSection needs to match the configuration definition in
      // the package.json
      configurationSection: 'plsqllint',
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.sql')
    }
  };

  // Create the server options used for the vscode_languageclient.LanguageClient
  // Note: the server will be started by the client
  let serverOptions:vscode_languageclient.ServerOptions = {
    command: javaPath,
    args: ['-jar', serverJarPath],
    // options: { stdio: 'pipe' }
  };

  let debugOptions:vscode_languageclient.ServerOptions = {
    command: javaPath,
    args: ['-agentlib:jdwp=transport=dt_shmem,server=y,suspend=y,address=8765,quiet=y', '-jar', serverJarPath],
    // args: ['-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=*:5005,quiet=y', '-jar', serverJarPath],
    // options: { stdio: 'pipe' }
  };
  // console.log(debugOptions);

  langClient = new vscode_languageclient.LanguageClient(LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME, serverOptions, clientOptions, true);
  // langClient = new vscode_languageclient.LanguageClient(LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME, debugOptions, clientOptions, false);


  // let item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
  output.appendLine (LANGUAGE_CLIENT_STARTING_MSG);

  await langClient.start();
  langClient.onTelemetry((e) => {
    output.appendLine(e);
  });
  output.appendLine(LANGUAGE_CLIENT_READY_MSG);
}


// function toggleItem(editor: vscode.TextEditor | undefined, item: vscode.StatusBarItem) {
//   if (editor && editor.document &&
//     (editor.document.languageId === 'plsql')) {
//     item.show();
//   } else {
//     item.hide();
//   }
// }

function javaVerifierPromise(testPath: string | undefined): Promise<string> {
  return new Promise(function (resolve, reject) {
    if (!testPath) {
      reject(LANGUAGE_CLIENT_JAVA_VSCODE_SETTING_NULL);
    }
    else {
      let pathToJavaExec = path.join(testPath, '/bin/java');
      cp.execFile(pathToJavaExec, ['-version'], {}, function (error, stdout, stderr) {
        if (error) {
          reject(error);
        }
        if (stderr) {
          if (stderr.indexOf('1.8') >= 0) {
            resolve(pathToJavaExec);
          }
          else {
            resolve(pathToJavaExec);
            // reject(LANGUAGE_CLIENT_JAVA_INVALID_VERSION);
          }
        }
      });
    }
  });
}
// this method is called when your extension is deactivated
export function deactivate() {
  langClient.stop();
}
