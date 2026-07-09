/* eslint-disable i18next/no-literal-string */
// (Web Crypto algorithm names and key usages, not user-facing copy)

/** Marker identifying an encrypted DoHabit backup file. */
const BACKUP_FORMAT = 'dohabit-encrypted-backup';

/**
 * PBKDF2 iteration count for new backups
 * (OWASP recommendation for PBKDF2-HMAC-SHA256)
 */
const PBKDF2_ITERATIONS = 310_000;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Self-describing envelope for an encrypted backup.
 * Kept as plain JSON so the import file picker still accepts it.
 */
export interface EncryptedBackupEnvelope {
	format: typeof BACKUP_FORMAT;
	version: 1;
	kdf: {
		name: 'PBKDF2';
		hash: 'SHA-256';
		iterations: number;
	};

	/** Base64-encoded random PBKDF2 salt */
	salt: string;

	/** Base64-encoded random AES-GCM initialization vector */
	iv: string;

	/** Base64-encoded AES-GCM ciphertext (includes the auth tag) */
	data: string;
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
	const binary = atob(str);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	return bytes;
}

/**
 * Derives an AES-GCM key from a user password via PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

/**
 * Encrypts a JSON string with a user password.
 * Returns the encrypted backup envelope as a JSON string.
 */
export async function encryptJsonWithPassword(json: string, password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: iv as BufferSource },
		key,
		new TextEncoder().encode(json)
	);

	const envelope: EncryptedBackupEnvelope = {
		format: BACKUP_FORMAT,
		version: 1,
		kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS },
		salt: toBase64(salt),
		iv: toBase64(iv),
		data: toBase64(new Uint8Array(ciphertext))
	};

	return JSON.stringify(envelope);
}

/**
 * Checks whether parsed backup data is an encrypted backup envelope.
 */
export function isEncryptedBackup(data: unknown): data is EncryptedBackupEnvelope {
	if (typeof data !== 'object' || data === null) return false;

	const envelope = data as Partial<EncryptedBackupEnvelope>;

	return envelope.format === BACKUP_FORMAT
		&& envelope.version === 1
		&& typeof envelope.salt === 'string'
		&& typeof envelope.iv === 'string'
		&& typeof envelope.data === 'string'
		&& envelope.kdf?.name === 'PBKDF2'
		&& typeof envelope.kdf.iterations === 'number';
}

/**
 * Decrypts an encrypted backup envelope back into the original JSON string.
 * Throws when the password is wrong or the file is corrupted
 * (AES-GCM authentication fails).
 */
export async function decryptJsonWithPassword(envelope: EncryptedBackupEnvelope, password: string): Promise<string> {
	const salt = fromBase64(envelope.salt);
	const iv = fromBase64(envelope.iv);
	const key = await deriveKey(password, salt, envelope.kdf.iterations);

	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: iv as BufferSource },
		key,
		fromBase64(envelope.data) as BufferSource
	);

	return new TextDecoder().decode(plaintext);
}
