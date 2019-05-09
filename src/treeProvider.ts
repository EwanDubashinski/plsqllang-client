import * as vscode from 'vscode';
import * as vscode_languageclient from 'vscode-languageclient';

export enum NodeKind {
   CONNECTION,
   OBJECT_TYPE,
   OBJECT
}

export enum ObjectType {
   TABLE,
   VIEW
}

export class DBNode {
   constructor (label: string, kind: NodeKind, connection: string, object_type: ObjectType | undefined) {
      this.label = label;
      this.kind = kind;
      this.connection = connection;
      this.object_type = object_type;
   }
   public label: string;
   public kind: NodeKind;
   public connection: string;
   public object_type: ObjectType | undefined;

   public getChildren(langClient: vscode_languageclient.LanguageClient): DBNode[] | Thenable<DBNode[]> {
      if (this.kind === NodeKind.CONNECTION) {
         return [new DBNode('Tables', NodeKind.OBJECT_TYPE, this.connection, ObjectType.TABLE)];
      } else if (this.kind === NodeKind.OBJECT_TYPE) {
         return langClient.sendRequest<string>('getTree', 'biss_dev2/biss@biss').then((e: string) => {
                  console.log("responce: " + e);
                  let objects: DBNode[] = [];
                  let labels: string[];
                  labels = eval(e);
                  const connection = this.connection;
                  labels.forEach(function (objectName) {
                     objects.push(new DBNode(objectName, NodeKind.OBJECT, connection, ObjectType.TABLE))
                  });
                  return objects;
               });
      } else return [];
   }
}

export class DBTreeDataProvider implements vscode.TreeDataProvider<DBNode> {
   constructor (readonly langClient: vscode_languageclient.LanguageClient) {
   }

   public getTreeItem(element: DBNode): vscode.TreeItem {
		return {
         label: element.label,
         collapsibleState: element.kind === NodeKind.OBJECT ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
		};
   }

   private getConnections(): DBNode[] {
      return [new DBNode('biss_dev2@biss', NodeKind.CONNECTION, 'biss_dev2@biss', undefined)];
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