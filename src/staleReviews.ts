import * as vscode from "vscode";
import * as path from "path";

import { AuditedFile, PartiallyAuditedFile } from "./types";

export interface StaleReviewItem {
    type: "file" | "region" | "finding";
    path: string;
    rootPath: string;
    author: string;
    startLine?: number;
    endLine?: number;
    entryLabel?: string;  // For findings: the title of the finding
    entryType?: string;   // For findings: the type of entry (Finding or Note)
}

export class StaleReviewsTree implements vscode.TreeDataProvider<StaleReviewItem> {
    private staleItems: StaleReviewItem[];

    private _onDidChangeTreeDataEmitter = new vscode.EventEmitter<StaleReviewItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeDataEmitter.event;

    refresh(): void {
        this._onDidChangeTreeDataEmitter.fire();
    }

    constructor(staleItems: StaleReviewItem[]) {
        this.staleItems = staleItems;
    }

    setStaleItems(items: StaleReviewItem[]): void {
        this.staleItems = items;
        this.refresh();
    }

    // tree data provider
    getChildren(element?: StaleReviewItem): StaleReviewItem[] {
        if (element === undefined) {
            return this.staleItems;
        }
        return [];
    }

    getParent(_element: StaleReviewItem): undefined {
        return undefined;
    }

    getTreeItem(item: StaleReviewItem): vscode.TreeItem {
        let label: string;
        let description: string;
        let tooltip: string;

        if (item.type === "file") {
            label = path.basename(item.path);
            description = "Full file";
            tooltip = `${item.path} - reviewed by ${item.author}\nContent has changed since review`;
        } else if (item.type === "finding") {
            label = item.entryLabel || "Untitled Finding";
            description = `${path.basename(item.path)}:${item.startLine}-${item.endLine}`;
            tooltip = `${item.entryLabel || "Finding"} - by ${item.author}\n${item.path}:${item.startLine}-${item.endLine}\nContent has changed since creation`;
        } else {
            // region
            label = `${path.basename(item.path)}:${item.startLine}-${item.endLine}`;
            description = `Lines ${item.startLine}-${item.endLine}`;
            tooltip = `${item.path} - reviewed by ${item.author}\nContent has changed since review`;
        }

        const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("problemsWarningIcon.foreground"));

        const fullPath = path.join(item.rootPath, item.path);
        const startLine = item.startLine ?? 0;
        const endLine = item.endLine ?? 0;

        treeItem.command = {
            command: "weAudit.openFileLines",
            title: "Open File",
            arguments: [vscode.Uri.file(fullPath), startLine, endLine],
        };

        treeItem.description = description;
        treeItem.tooltip = tooltip;

        return treeItem;
    }
}

export class StaleReviews {
    private treeDataProvider: StaleReviewsTree;

    constructor(context: vscode.ExtensionContext, staleItems: StaleReviewItem[]) {
        this.treeDataProvider = new StaleReviewsTree(staleItems);

        vscode.window.onDidChangeActiveColorTheme(() => this.treeDataProvider.refresh());

        const treeView = vscode.window.createTreeView("staleReviews", { treeDataProvider: this.treeDataProvider });
        context.subscriptions.push(treeView);
    }

    public refresh(): void {
        this.treeDataProvider.refresh();
    }

    public setStaleItems(items: StaleReviewItem[]): void {
        this.treeDataProvider.setStaleItems(items);
        this.refresh();
    }
}
