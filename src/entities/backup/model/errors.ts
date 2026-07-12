/* eslint-disable i18next/no-literal-string -- Error names and codes are domain identifiers. */
export type BackupErrorCode =
	| 'INVALID_BACKUP'
	| 'BACKUP_VERSION_TOO_NEW'
	| 'BACKUP_VERSION_TOO_OLD'
	| 'DATABASE_VERSION_TOO_NEW'
	| 'CHECKSUM_MISMATCH'
	| 'DUPLICATE_KEY'
	| 'RELATIONSHIP_INVALID'
	| 'TEMPLATE_INCOMPATIBLE';

export class BackupValidationError extends Error {
	readonly code: BackupErrorCode;

	constructor(code: BackupErrorCode) {
		super(code);
		this.name = 'BackupValidationError';
		this.code = code;
	}
}
