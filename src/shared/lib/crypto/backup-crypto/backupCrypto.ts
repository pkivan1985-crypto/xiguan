/* eslint-disable i18next/no-literal-string -- Web Crypto names and backup markers are protocol identifiers. */

const ENCRYPTED_BACKUP_FORMAT = 'repeat-outcome-encrypted-backup' as const;
const PBKDF2_ITERATIONS = 600_000 as const;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export interface EncryptedBackupEnvelopeV1 {
	format: typeof ENCRYPTED_BACKUP_FORMAT;
	envelopeVersion: 1;
	kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: typeof PBKDF2_ITERATIONS };
	cipher: { name: 'AES-GCM'; keyLength: 256 };
	salt: string;
	iv: string;
	data: string;
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function isBase64(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0 && value.length % 4 === 0
		&& /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

function fromBase64(value: string): Uint8Array {
	if (!isBase64(value)) throw new Error('INVALID_ENCRYPTED_BACKUP');
	const binary = atob(value);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt'],
	);
}

export function isEncryptedBackupEnvelope(value: unknown): value is EncryptedBackupEnvelopeV1 {
	if (typeof value !== 'object' || value === null) return false;
	const envelope = value as Partial<EncryptedBackupEnvelopeV1>;
	if (envelope.format !== ENCRYPTED_BACKUP_FORMAT || envelope.envelopeVersion !== 1
		|| envelope.kdf?.name !== 'PBKDF2' || envelope.kdf.hash !== 'SHA-256'
		|| envelope.kdf.iterations !== PBKDF2_ITERATIONS || envelope.cipher?.name !== 'AES-GCM'
		|| envelope.cipher.keyLength !== 256 || !isBase64(envelope.salt) || !isBase64(envelope.iv) || !isBase64(envelope.data)) return false;
	try {
		return fromBase64(envelope.salt).length === SALT_LENGTH
			&& fromBase64(envelope.iv).length === IV_LENGTH
			&& fromBase64(envelope.data).length > 16;
	} catch {
		return false;
	}
}

export async function encryptBackupJson(json: string, password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const key = await deriveKey(password, salt);
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(json));
	const envelope: EncryptedBackupEnvelopeV1 = {
		format: ENCRYPTED_BACKUP_FORMAT,
		envelopeVersion: 1,
		kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS },
		cipher: { name: 'AES-GCM', keyLength: 256 },
		salt: toBase64(salt),
		iv: toBase64(iv),
		data: toBase64(new Uint8Array(ciphertext)),
	};
	return JSON.stringify(envelope);
}

export async function decryptBackupJson(envelope: EncryptedBackupEnvelopeV1, password: string): Promise<string> {
	if (!isEncryptedBackupEnvelope(envelope)) throw new Error('INVALID_ENCRYPTED_BACKUP');
	const salt = fromBase64(envelope.salt);
	const iv = fromBase64(envelope.iv);
	const key = await deriveKey(password, salt);
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, fromBase64(envelope.data) as BufferSource);
	return new TextDecoder().decode(plaintext);
}

// Temporary compatibility aliases until Task 7 removes the old DoHabit data-management wiring.
export const encryptJsonWithPassword = encryptBackupJson;
export const decryptJsonWithPassword = decryptBackupJson;
export const isEncryptedBackup = isEncryptedBackupEnvelope;
export type EncryptedBackupEnvelope = EncryptedBackupEnvelopeV1;
