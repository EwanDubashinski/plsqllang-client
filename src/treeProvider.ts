import * as vscode from 'vscode';
import * as vscode_languageclient from 'vscode-languageclient/node';

export enum NodeKind {
   CONNECTION = 'CONNECTION',
   OBJECT_TYPE = 'OBJECT_TYPE',
   OBJECT = 'OBJECT'
}

export enum ObjectType {
   TABLE = 'TABLE',
   VIEW = 'VIEW',
   PACKAGE = 'PACKAGE',
   PACKAGE_BODY = 'PACKAGE BODY',
   FUNCTION = 'FUNCTION',
   PROCEDURE = 'PROCEDURE',
   INDEX = 'INDEX',
   TRIGGER = 'TRIGGER',
   SEQUENCE = 'SEQUENCE',
   SYNONYM = 'SYNONYM'
}

export class DBNode extends vscode.TreeItem {
   constructor (label: string, kind: NodeKind, connection: string, object_type: ObjectType | undefined) {
      super(label, kind === NodeKind.OBJECT ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
      this.label = label;
      this.kind = kind;
      this.connection = connection;
      this.object_type = object_type;
      // this.tooltip = this.kind;
      this.contextValue = this.kind;
      this.command = { command: 'plsql-lsp.activateConnection', title: "plsql-lsp.activateConnection", arguments: [this], };
   }
   public label: string;
   public kind: NodeKind;
   public connection: string;
   public object_type: ObjectType | undefined;
   public active: boolean = false;

   get description(): string {
		return this.active ? "Active" : "";
	}

   public getChildren(langClient: vscode_languageclient.LanguageClient): DBNode[] | Thenable<DBNode[]> {
      if (this.kind === NodeKind.CONNECTION) {
         // Object.values(MyEnum) - enum to array
         return [
            new DBNode('Tables', NodeKind.OBJECT_TYPE, this.connection, ObjectType.TABLE),
            new DBNode('Views', NodeKind.OBJECT_TYPE, this.connection, ObjectType.VIEW),
            new DBNode('Packages', NodeKind.OBJECT_TYPE, this.connection, ObjectType.PACKAGE),
            new DBNode('Functions', NodeKind.OBJECT_TYPE, this.connection, ObjectType.FUNCTION),
            new DBNode('Procedures', NodeKind.OBJECT_TYPE, this.connection, ObjectType.PROCEDURE),
            new DBNode('Indexes', NodeKind.OBJECT_TYPE, this.connection, ObjectType.INDEX),
            new DBNode('Triggers', NodeKind.OBJECT_TYPE, this.connection, ObjectType.TRIGGER),
            new DBNode('Sequences', NodeKind.OBJECT_TYPE, this.connection, ObjectType.SEQUENCE),
            new DBNode('Synonyms', NodeKind.OBJECT_TYPE, this.connection, ObjectType.SYNONYM)
         ];
      } else if (this.kind === NodeKind.OBJECT_TYPE) {
         const params = {connection: this.connection, object_type: this.object_type};
         return langClient.sendRequest<string>('getTree', JSON.stringify(params)).then((e: string) => {
                  // console.log("responce: " + e);
                  let objects: DBNode[] = [];
                  let labels: string[];
                  labels = eval(e);
                  const connection = this.connection;
                  const object_type = this.object_type;
                  labels.forEach(function (objectName) {
                     objects.push(new DBNode(objectName, NodeKind.OBJECT, connection, object_type))
                  });
                  return objects;
               });
      } else return [];
   }
}

export class DBTreeDataProvider implements vscode.TreeDataProvider<DBNode> {

   private _onDidChangeTreeData: vscode.EventEmitter<DBNode | undefined> = new vscode.EventEmitter<DBNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<DBNode | undefined> = this._onDidChangeTreeData.event;

   constructor (readonly langClient: vscode_languageclient.LanguageClient) {
   }

   public refresh(node: DBNode): void {
		this._onDidChangeTreeData.fire(node);
	}

   public getTreeItem(element: DBNode): vscode.TreeItem {
		return element;
   }

   private getConnections(): DBNode[] {
      const conf = vscode.workspace.getConfiguration('plsql-lsp');//.get('connections.connectionString');
      const conn = <string[]>conf.get('connectionStrings');
      let connNodes: DBNode[] = [];
      conn.forEach((element) => {
         connNodes.push(new DBNode(element.replace(new RegExp("/.*@"), "@"), NodeKind.CONNECTION, element, undefined));
      })
      return connNodes;
      // return [{connection: 'biss_dev2@biss', kind: NodeKind.CONNECTION, label: 'biss_dev2@biss', object_type: undefined}];
   }




   public getChildren(element?: DBNode): DBNode[] | Thenable<DBNode[]> {
      // return [{name: "ddd"}];

      return element ? element.getChildren(this.langClient) : this.getConnections();
		// return element ? this.getChildren(element) : this.roots;
   }

   // public get roots(): Thenable<DBNode[]> {
	// 	return this.langClient.sendRequest<DBNode>('getTree', 'biss_dev2/biss@biss').then((e) => {
   //       console.log("responce: " + e);
   //       return [e];
   //    });
	// }

}