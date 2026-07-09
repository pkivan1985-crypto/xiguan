import i18n from 'i18next';
import { get } from 'idb-keyval';
import { STORAGE_KEYS } from '@shared/const';
import { encryptJsonWithPassword } from '@shared/lib/crypto';
import { formatDate } from '@shared/lib/date-time';

/**
 * Downloads a JSON file containing app data,
 * optionally encrypted with a user-provided password.
 */
async function exportAppData() {
	// Notify user before starting the download
	if (window.confirm(i18n.t('menu.dataManagement.backup.export.dialogs.exportConfirm'))) {
		// Optional password for an encrypted backup; cancel aborts the export
		const password = window.prompt(i18n.t('menu.dataManagement.backup.export.dialogs.passwordPrompt'), '');
		if (password === null) return;

		// Collect data from all storage keys
		const [habits, notes, achievements] = await Promise.all([
			get(STORAGE_KEYS.HABITS),
			get(STORAGE_KEYS.NOTES),
			get(STORAGE_KEYS.ACHIEVEMENTS)
		]);

		const dataToExport = {
			[STORAGE_KEYS.HABITS]: habits,
			[STORAGE_KEYS.NOTES]: notes,
			[STORAGE_KEYS.ACHIEVEMENTS]: achievements
		};

		// Keep the plain JSON format when no password was provided
		const jsonStr = password
			? await encryptJsonWithPassword(JSON.stringify(dataToExport), password)
			: JSON.stringify(dataToExport);

		const blob = new Blob([jsonStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		// Create a unique filename with a timestamp (e.g., DoHabit_backup_2008-10-31_14-10)
		const dateStr = formatDate(new Date(), { includeTime: true }).replace(/(\s)|(:)/g, (m) => m === ':' ? '-' : '_');
		const fileName = `DoHabit_backup_${dateStr}.json`;

		// Temporary link to trigger the browser's download manager
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();

		// Cleanup the memory-held URL object
		URL.revokeObjectURL(url);
	}
}

export { exportAppData };