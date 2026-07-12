/* eslint-disable i18next/no-literal-string -- Backup markers and error codes are protocol identifiers. */
import {
	BACKUP_FORMAT,
	type BackupPreview,
	type DigestText,
	type TemplateDefinitionRef,
	type ValidatedBackup,
	validatePlainBackup,
} from '@entities/backup';
import {
	decryptBackupJson,
	type EncryptedBackupEnvelopeV1,
	isEncryptedBackupEnvelope,
} from '@shared/lib/crypto';
import type { CardTemplate } from '@entities/card-template';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';
import { readBackupFile, type BackupFileLike } from '../lib/readBackupFile';

export type BackupInspectionErrorCode = 'INVALID_JSON' | 'UNSUPPORTED_FORMAT' | 'PASSWORD_OR_DATA_INVALID';

export class BackupInspectionError extends Error {
	readonly code: BackupInspectionErrorCode;

	constructor(code: BackupInspectionErrorCode) {
		super(code);
		this.name = 'BackupInspectionError';
		this.code = code;
	}
}

export type InspectBackupResult =
	| { kind: 'password-required'; encryptedEnvelope: EncryptedBackupEnvelopeV1 }
	| { kind: 'ready'; backup: ValidatedBackup; preview: BackupPreview };

async function defaultDigest(value: string): Promise<string> {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseJson(text: string, code: BackupInspectionErrorCode): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new BackupInspectionError(code);
	}
}

export async function inspectBackupText(
	text: string,
	definitions: TemplateDefinitionRef[],
	password?: string,
	digest: DigestText = defaultDigest,
): Promise<InspectBackupResult> {
	const outer = parseJson(text, 'INVALID_JSON');
	if (isEncryptedBackupEnvelope(outer)) {
		if (typeof password === 'undefined') return { kind: 'password-required', encryptedEnvelope: outer };
		let innerText: string;
		try {
			innerText = await decryptBackupJson(outer, password);
		} catch {
			throw new BackupInspectionError('PASSWORD_OR_DATA_INVALID');
		}
		const inner = parseJson(innerText, 'PASSWORD_OR_DATA_INVALID');
		const backup = await validatePlainBackup(inner, definitions, digest);
		return { kind: 'ready', backup, preview: { ...backup.preview, encrypted: true } };
	}
	if (typeof outer !== 'object' || outer === null || (outer as { format?: unknown }).format !== BACKUP_FORMAT) {
		throw new BackupInspectionError('UNSUPPORTED_FORMAT');
	}
	const backup = await validatePlainBackup(outer, definitions, digest);
	return { kind: 'ready', backup, preview: backup.preview };
}

export async function inspectBackupFile(
	database: RepeatOutcomeDatabase,
	file: BackupFileLike,
	password?: string,
	digest: DigestText = defaultDigest,
): Promise<InspectBackupResult> {
	const text = await readBackupFile(file);
	const definitions = (await database.tableFor<CardTemplate>('cardTemplates').toArray()).map(({ id, version }) => ({ id, version }));
	return inspectBackupText(text, definitions, password, digest);
}

export function inspectBackupFileInApp(file: BackupFileLike, password?: string): Promise<InspectBackupResult> {
	return inspectBackupFile(appDatabase, file, password);
}
