import type { BackupPreview } from '@entities/backup';

export interface BackupFile {
	contents: string;
	fileName: string;
	encrypted: boolean;
	preview: BackupPreview;
}

interface DownloadAnchor {
	href: string;
	download: string;
	click(): void;
	remove(): void;
}

export interface BackupDownloadEnvironment {
	createObjectURL(blob: Blob): string;
	revokeObjectURL(url: string): void;
	createAnchor(): DownloadAnchor;
}

const browserEnvironment: BackupDownloadEnvironment = {
	createObjectURL: (blob) => URL.createObjectURL(blob),
	revokeObjectURL: (url) => URL.revokeObjectURL(url),
	createAnchor: () => document.createElement('a'),
};

export function downloadBackup(file: BackupFile, environment: BackupDownloadEnvironment = browserEnvironment): void {
	const url = environment.createObjectURL(new Blob([file.contents], { type: 'application/json' }));
	const anchor = environment.createAnchor();
	try {
		anchor.href = url;
		anchor.download = file.fileName;
		anchor.click();
	} finally {
		anchor.remove();
		environment.revokeObjectURL(url);
	}
}
