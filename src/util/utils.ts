import { TFile, TFolder } from 'obsidian';
import CalendarPlugin from '../main';

/**
 * Helper to open a file passed in params within Obsidian (Tab/Separate)
 * @param params
 */
export const openFile = (params: {
	file: TFile;
	plugin: CalendarPlugin;
	newLeaf: boolean;
	leafBySplit?: boolean;
	line?: number;
}) => {
	const { file, plugin, newLeaf, leafBySplit, line } = params;
	let leaf = plugin.app.workspace.getLeaf(newLeaf);
	if (!newLeaf && leafBySplit) leaf = plugin.app.workspace.createLeafBySplit(leaf, 'vertical');
	plugin.app.workspace.setActiveLeaf(leaf, { focus: true });

	// If a specific line number is provided, include it in the eState
	const eState: any = { focus: true };
	if (line !== undefined) {
		eState.line = line;
	}

	leaf.openFile(file, { eState });
};

export const createNewMarkdownFile = async (
	plugin: CalendarPlugin,
	folder: TFolder,
	newFileName: string,
	content?: string
) => {
	// @ts-ignore
	const newFile = await plugin.app.fileManager.createNewMarkdownFile(folder, newFileName);
	if (content && content !== '') await plugin.app.vault.modify(newFile, content);
	openFile({ file: newFile, plugin: plugin, newLeaf: false });
};

export function isMouseEvent(e: React.TouchEvent | React.MouseEvent): e is React.MouseEvent {
	return e && 'screenX' in e;
}
