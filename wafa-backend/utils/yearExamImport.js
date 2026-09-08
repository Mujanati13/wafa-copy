import XLSX from 'xlsx';

export const MAX_YEAR_EXAM_ROWS = 2000;
export const examImportKey = ({ year, name }) => JSON.stringify([year, name.trim().toLowerCase()]);

export function parseYearExamWorkbook(buffer) {
    const zip = buffer?.[0] === 0x50 && buffer?.[1] === 0x4b;
    const ole = buffer?.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
    if (!zip && !ole) throw new Error('Veuillez fournir un fichier Excel .xlsx ou .xls valide.');
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: MAX_YEAR_EXAM_ROWS + 2 });
    } catch {
        throw new Error('Le fichier Excel est illisible ou endommagé.');
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('Le fichier ne contient aucune feuille.');
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
    const headers = (rows[0] || []).map(value => String(value).trim().toLowerCase());
    if (['anne', 'anne_name'].some(header => headers.filter(value => value === header).length !== 1)) {
        throw new Error('La première ligne doit contenir les colonnes anne et anne_name, chacune une seule fois.');
    }
    if (rows.length > MAX_YEAR_EXAM_ROWS + 1) throw new Error(`Maximum ${MAX_YEAR_EXAM_ROWS} lignes par fichier.`);
    const records = [];
    const errors = [];
    const seen = new Set();
    let skipped = 0;
    rows.slice(1).forEach((row, index) => {
        if (row.every(value => value === '' || value == null)) return;
        const rawYear = String(row[headers.indexOf('anne')] ?? '').trim();
        const rawName = row[headers.indexOf('anne_name')];
        const name = typeof rawName === 'string' ? rawName.trim() : '';
        const year = Number(rawYear);
        if (!/^\d{4}$/.test(rawYear) || year < 1000 || year > 9999) {
            errors.push({ row: index + 2, field: 'anne', message: 'Une année entière à quatre chiffres est requise.' });
        }
        if (!name || name.length > 200) {
            errors.push({ row: index + 2, field: 'anne_name', message: 'Un nom de 1 à 200 caractères est requis.' });
        }
        const record = { year, name };
        const key = examImportKey(record);
        if (seen.has(key)) { skipped++; return; }
        seen.add(key);
        records.push(record);
    });
    if (!records.length) throw new Error('Le fichier ne contient aucun examen.');
    return { records, skipped, errors: errors.slice(0, 100), errorCount: errors.length };
}
