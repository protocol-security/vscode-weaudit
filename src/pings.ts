import * as vscode from "vscode";
import * as path from "path";

import { FullEntry, EntryType } from "./types";

export interface PingItem {
    path: string;
    rootPath: string;
    startLine: number;
    endLine: number;
    author: string;
}

export class PingsTree implements vscode.TreeDataProvider<PingItem> {
    private pingItems: PingItem[];

    private _onDidChangeTreeDataEmitter = new vscode.EventEmitter<PingItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeDataEmitter.event;

    refresh(): void {
        this._onDidChangeTreeDataEmitter.fire();
    }

    constructor(pingItems: PingItem[]) {
        this.pingItems = pingItems;
    }

    setPingItems(items: PingItem[]): void {
        this.pingItems = items;
        this.refresh();
    }

    // tree data provider
    getChildren(element?: PingItem): PingItem[] {
        if (element === undefined) {
            return this.pingItems;
        }
        return [];
    }

    getParent(_element: PingItem): undefined {
        return undefined;
    }

    getTreeItem(item: PingItem): vscode.TreeItem {
        // Show author as the main label (like title/description in findings)
        const treeItem = new vscode.TreeItem(item.author, vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = new vscode.ThemeIcon("mention");

        // Show location as description (like in findings)
        let description = path.basename(item.path) + ":" + item.startLine.toString();
        if (item.endLine !== item.startLine) {
            description += "-" + item.endLine.toString();
        }
        treeItem.description = description;

        const fullPath = path.join(item.rootPath, item.path);
        const startLine = item.startLine ?? 0;
        const endLine = item.endLine ?? 0;
        
        treeItem.command = {
            command: "weAudit.openFileLines",
            title: "Open File",
            arguments: [vscode.Uri.file(fullPath), startLine, endLine],
        };

        // Set context value for menu items
        treeItem.contextValue = "ping";

        return treeItem;
    }
}

export class Pings {
    private treeDataProvider: PingsTree;

    constructor(context: vscode.ExtensionContext, pingItems: PingItem[]) {
        this.treeDataProvider = new PingsTree(pingItems);

        vscode.window.onDidChangeActiveColorTheme(() => this.treeDataProvider.refresh());

        const treeView = vscode.window.createTreeView("pings", { treeDataProvider: this.treeDataProvider });
        context.subscriptions.push(treeView);
    }

    public refresh(): void {
        this.treeDataProvider.refresh();
    }

    public setPingItems(items: PingItem[]): void {
        this.treeDataProvider.setPingItems(items);
        this.refresh();
    }

    public getPingItems(): PingItem[] {
        return this.treeDataProvider.getChildren();
    }

    public removePing(ping: PingItem): void {
        const items = this.getPingItems().filter(
            (item) =>
                !(
                    item.path === ping.path &&
                    item.rootPath === ping.rootPath &&
                    item.startLine === ping.startLine &&
                    item.endLine === ping.endLine &&
                    item.author === ping.author
                )
        );
        this.setPingItems(items);
    }

    public updatePing(ping: PingItem): void {
        this.refresh();
    }
}

