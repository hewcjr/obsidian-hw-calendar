import { App, FuzzySuggestModal, TFile } from 'obsidian';
import CalendarPlugin from '../main';
import { openFile } from '../util/utils';

export class SectionSuggestModal extends FuzzySuggestModal<{heading: string; line: number}> {
    private onChoose: (heading: {heading: string; line: number}) => void;
    private file: TFile;
    private plugin: CalendarPlugin;

    constructor(app: App, file: TFile, plugin: CalendarPlugin, onChoose?: (heading: {heading: string; line: number}) => void) {
        super(app);
        this.file = file;
        this.plugin = plugin;
        this.onChoose = onChoose || (() => {});
    }

    getItems(): {heading: string; line: number}[] {
        const cache = this.app.metadataCache.getFileCache(this.file);
        if (!cache || !cache.headings) return [];
        return cache.headings.map(h => ({ heading: h.heading, line: h.position.start.line }));
    }

    getItemText(item: {heading: string; line: number}): string {
        return item.heading;
    }

    onChooseItem(item: {heading: string; line: number}): void {
        this.onChoose(item);
        openFile({ file: this.file, plugin: this.plugin, newLeaf: false, line: item.line });
    }
}

