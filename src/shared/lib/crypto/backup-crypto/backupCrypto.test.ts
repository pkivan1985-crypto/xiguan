import { describe, expect, it } from 'vitest';

import { decryptBackupJson, encryptBackupJson, isEncryptedBackupEnvelope } from './backupCrypto';

describe('project backup crypto', () => {
	const sampleJson = JSON.stringify({ format: 'repeat-outcome-backup', data: { title: '晨跑' } });

	it('round-trips the project envelope with fixed safe parameters', async () => {
		const encrypted = JSON.parse(await encryptBackupJson(sampleJson, 'correct horse battery staple'));
		expect(encrypted).toMatchObject({
			format: 'repeat-outcome-encrypted-backup', envelopeVersion: 1,
			kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000 },
			cipher: { name: 'AES-GCM', keyLength: 256 },
		});
		expect(isEncryptedBackupEnvelope(encrypted)).toBe(true);
		expect(await decryptBackupJson(encrypted, 'correct horse battery staple')).toBe(sampleJson);
	});

	it('uses independent random salt, iv, and ciphertext', async () => {
		const first = JSON.parse(await encryptBackupJson(sampleJson, '12345678'));
		const second = JSON.parse(await encryptBackupJson(sampleJson, '12345678'));
		expect(first.salt).not.toBe(second.salt);
		expect(first.iv).not.toBe(second.iv);
		expect(first.data).not.toBe(second.data);
		expect(first.data).not.toContain('晨跑');
	});

	it('rejects wrong passwords and authenticated-data tampering', async () => {
		const envelope = JSON.parse(await encryptBackupJson(sampleJson, 'right-password'));
		await expect(decryptBackupJson(envelope, 'wrong-password')).rejects.toThrow();
		envelope.data = `${envelope.data.slice(0, -2)}AA`;
		await expect(decryptBackupJson(envelope, 'right-password')).rejects.toThrow();
	});

	it('supports unicode passwords and payloads', async () => {
		const envelope = JSON.parse(await encryptBackupJson(sampleJson, '密码🔑123456'));
		expect(await decryptBackupJson(envelope, '密码🔑123456')).toBe(sampleJson);
	});

	it('rejects DoHabit, malformed base64, and attacker-controlled KDF parameters', async () => {
		expect(isEncryptedBackupEnvelope({ format: 'dohabit-encrypted-backup', version: 1 })).toBe(false);
		const envelope = JSON.parse(await encryptBackupJson(sampleJson, '12345678'));
		expect(isEncryptedBackupEnvelope({ ...envelope, kdf: { ...envelope.kdf, iterations: 9_999_999 } })).toBe(false);
		expect(isEncryptedBackupEnvelope({ ...envelope, iv: 'not base64!' })).toBe(false);
	});
});
