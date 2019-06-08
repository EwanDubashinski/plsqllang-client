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

let langClient: vscode_languageclient.LanguageClient;
let activeConnection: string;
let treeDataProvider: DBTreeDataProvider;
let output: vscode.OutputChannel;

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
    function (res: any) {
      context.subscriptions.push(initLangClient(serverJarPath, res.toString()).start());
    }
  ).catch(function (rej) {
    console.log(rej);

    javaVerifierPromise(process.env['JAVA_HOME']).then(
      function (res: any) {
        let disposable = initLangClient(serverJarPath, res.toString()).start();
        context.subscriptions.push(disposable);
      }
    ).catch(function (rej) {
      console.log(rej);

      vscode.window.showWarningMessage(LANGUAGE_CLIENT_JAVA_WARNING);
    });
  });



  context.subscriptions.push(
    vscode.commands.registerCommand('plsql-lsp.exec', () => {
      // Create and show a new webview
      const panel = vscode.window.createWebviewPanel(
        'query-results', // Identifies the type of the webview. Used internally
        'Query results', // Title of the panel displayed to the user
        vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
        { enableScripts: true } // Webview options. More on these later.
      );
      panel.webview.html = "Loading...";
      getQueryResults(panel);
    })
  );
  const myScheme = 'oraddl';
  const myProvider = new class implements vscode.TextDocumentContentProvider {

    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
      // simply invoke cowsay, use uri-path as text
      let path: string[] = uri.path.split("/");
      const conn = path[0].replace('+', "/").replace('+', "/");
      const params = { connection: conn, name: path[2], type: path[1] };
      return langClient.sendRequest<string>("getDDL", JSON.stringify(params)).then((e) => {
        return JSON.parse(e).ddl;
      });;
    }
  }
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

  context.subscriptions.push(vscode.commands.registerCommand('plsql-lsp.activateConnection', async (node: treeProvider.DBNode) => {
    if (node.kind === treeProvider.NodeKind.CONNECTION) {
      if (!node.active) {
        node.active = true;
      } else {
        node.active = false;
      }
      activeConnection = node.connection;
      langClient.sendNotification("activateConnection", activeConnection);
      treeDataProvider.refresh(node);
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('oraddl.test', async (node: treeProvider.DBNode) => {
    // console.log(node.object_type);

    let uri = vscode.Uri.parse('oraddl:' + node.connection.replace(new RegExp('/', 'g'), "+") + "/" + node.object_type + "/" + node.label);
    //   activeConnection = node.connection;
    let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider

    await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
    await vscode.languages.setTextDocumentLanguage(doc, "plsql");

  }));
  output = window.createOutputChannel("Oracle");
}

function getWebviewContent(results: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Query results</title>
        <style>
        .container {
           display: table;
           border-collapse: collapse;
          }

          .grid-row {
            display: table-row;
          }

          .grid-cell {
            display: table-cell;
            padding: 3px;
            border: 1px solid var(--vscode-dropdown-border);
        }
     </style>
    </head>
      <body>
        <script>
          let array = ` + results + `;
          let container = document.createElement('div');
          container.setAttribute('class', 'container');
          document.body.appendChild(container);
          array.forEach(rowValue => {
            let row = document.createElement('div');
            row.setAttribute('class', 'grid-row');
            container.appendChild(row);
            rowValue.forEach(cellValue => {
                let cell = document.createElement('div');
                cell.setAttribute('class', 'grid-cell');
                cell.textContent = cellValue;
                row.appendChild(cell);
            });
          });
        </script>
      </body>
    </html>`;
}

function getQueryResults(panel: vscode.WebviewPanel) {
  let query: string = "";

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    query = editor.document.getText(editor.selection)
    if (!query) query = editor.document.getText();
  }
  if (query) {
    const params = { connection: activeConnection, query: query };

    langClient.sendRequest<string>("getQueryResults", JSON.stringify(params)).then((e) => {
      panel.webview.html = getWebviewContent(e);
    });
  }
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

  langClient = new vscode_languageclient.LanguageClient(LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME, serverOptions, clientOptions, true);

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
    // langClient.onNotification("traceMsg", function(e) {
    //   console.log(e);
    // })
    langClient.onTelemetry((e) => {
      output.append(e);
    })

    console.log("before DBTreeDataProvider");

    treeDataProvider = new DBTreeDataProvider(langClient);
    vscode.window.createTreeView('dbObjects', { treeDataProvider });
    console.log("after createTreeView");

    console.log(LANGUAGE_CLIENT_READY_MSG);

    item.text = LANGUAGE_CLIENT_READY_MSG;
    toggleItem(vscode.window.activeTextEditor, item);

    window.onDidChangeActiveTextEditor((editor) => {
      toggleItem(editor, item);
    });

    // langClient.sendRequest('getTree', 'biss_dev2/biss@biss').then((e) => {
    //    console.log(e);
    // });

    // context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('ftp', treeDataProvider));

  });



  return langClient;
}


function toggleItem(editor: vscode.TextEditor | undefined, item: vscode.StatusBarItem) {
  if (editor && editor.document &&
    (editor.document.languageId === 'plsql')) {
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
