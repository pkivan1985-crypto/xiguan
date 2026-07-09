import { describe, expect, it } from 'vitest';
import { decryptJsonWithPassword, encryptJsonWithPassword, isEncryptedBackup } from './backupCrypto';

describe('backupCrypto', () => {
	const sampleJson = JSON.stringify({ habits: [{ id: '1', title: 'Read' }], notes: [] });

	it('round-trips JSON through encryption and decryption', async () => {
		const envelopeStr = await encryptJsonWithPassword(sampleJson, 'correct horse battery staple');
		const envelope = JSON.parse(envelopeStr);

		expect(isEncryptedBackup(envelope)).toBe(true);

		const decrypted = await decryptJsonWithPassword(envelope, 'correct horse battery staple');
		expect(decrypted).toBe(sampleJson);
	});

	it('does not contain the plaintext in the envelope', async () => {
		const envelopeStr = await encryptJsonWithPassword(sampleJson, 'secret');

		expect(envelopeStr).not.toContain('Read');
		expect(envelopeStr).not.toContain('habits');
	});

	it('produces a different ciphertext each time (random salt/iv)', async () => {
		const first = JSON.parse(await encryptJsonWithPassword(sampleJson, 'secret'));
		const second = JSON.parse(await encryptJsonWithPassword(sampleJson, 'secret'));

		expect(first.data).not.toBe(second.data);
		expect(first.salt).not.toBe(second.salt);
		expect(first.iv).not.toBe(second.iv);
	});

	it('rejects a wrong password', async () => {
		const envelope = JSON.parse(await encryptJsonWithPassword(sampleJson, 'right'));

		await expect(decryptJsonWithPassword(envelope, 'wrong')).rejects.toThrow();
	});

	it('supports unicode passwords and content', async () => {
		const json = JSON.stringify({ note: 'Привет 你好 🎉' });
		const envelope = JSON.parse(await encryptJsonWithPassword(json, 'пароль密码🔑'));

		expect(await decryptJsonWithPassword(envelope, 'пароль密码🔑')).toBe(json);
	});

	it('isEncryptedBackup rejects plain backups and malformed data', () => {
		expect(isEncryptedBackup({ 'dohabit-habits-storage': [] })).toBe(false);
		expect(isEncryptedBackup(null)).toBe(false);
		expect(isEncryptedBackup('string')).toBe(false);
		expect(isEncryptedBackup({ format: 'dohabit-encrypted-backup' })).toBe(false);
	});
});
