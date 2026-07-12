/* eslint-disable i18next/no-literal-string -- File extensions, MIME types, and error names are protocol identifiers. */
export const MAX_BACKUP_FILE_BYTES = 50 * 1024 * 1024;

export interface BackupFileLike {
	name: string;
	size: number;
	type: string;
	text(): Promise<string>;
}

export type BackupFileErrorCode = 'FILE_TOO_LARGE' | 'UNSUPPORTED_FILE' | 'FILE_READ_FAILED';

export class BackupFileError extends Error {
	readonly code: BackupFileErrorCode;

	constructor(code: BackupFileErrorCode) {
		super(code);
		this.name = 'BackupFileError';
		this.code = code;
	}
}

export async function readBackupFile(file: BackupFileLike): Promise<string> {
	if (file.size > MAX_BACKUP_FILE_BYTES) throw new BackupFileError('FILE_TOO_LARGE');
	if (!file.name.toLowerCase().endsWith('.json') || (file.type !== '' && file.type !== 'application/json' && file.type !== 'text/json')) {
		throw new BackupFileError('UNSUPPORTED_FILE');
	}
	try {
		return await file.text();
	} catch {
		throw new BackupFileError('FILE_READ_FAILED');
	}
}
