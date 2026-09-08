import { useRef, useState } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/utils';

export default function ImportYearExamsDialog({ modules, onImported }) {
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState([]);
  const [result, setResult] = useState(null);
  const fileInput = useRef(null);

  const downloadTemplate = async () => {
    setDownloading(true);
    setError('');
    try {
      const { data } = await api.get('/exams/import-template', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'modele-examens-par-annees.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Impossible de télécharger le modèle. Réessayez.');
    } finally { setDownloading(false); }
  };

  const submit = async event => {
    event.preventDefault();
    if (!moduleId || !file || busy) return;
    setError(''); setRowErrors([]); setResult(null);
    if (!/\.(xlsx|xls)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
      setError('Choisissez un fichier .xlsx ou .xls de 5 Mo maximum.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('moduleId', moduleId);
      body.append('file', file);
      const { data } = await api.post('/exams/import', body);
      setResult(data.data);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await onImported();
    } catch (err) {
      setError(err.response?.data?.message || 'Import impossible. Réessayez avec le même fichier ; les examens déjà présents seront ignorés.');
      setRowErrors(err.response?.data?.errors || []);
    } finally { setBusy(false); }
  };

  return <>
    <Button size="lg" variant="outline" onClick={() => { setOpen(true); setError(''); setRowErrors([]); setResult(null); }}>
      <Upload className="mr-2 h-5 w-5" />Importer des examens (Excel)
    </Button>
    <Dialog open={open} onOpenChange={value => { if (!busy && !downloading) { setOpen(value); if (!value) setFile(null); } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" showCloseButton={!busy && !downloading}>
        <DialogHeader>
          <DialogTitle>Créer des examens par années depuis Excel</DialogTitle>
          <DialogDescription>Choisissez le module de destination pour toutes les lignes du fichier.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Première feuille : <strong>anne</strong> (année, ex. 2024) et <strong>anne_name</strong> (nom, ex. 2024 normal). Formats .xlsx et .xls, 5 Mo et 2 000 lignes maximum. Les examens de même année et nom dans ce module sont ignorés. Corrigez toutes les lignes invalides avant l’import.</p>
        <Button variant="outline" onClick={downloadTemplate} disabled={busy || downloading}>
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Télécharger le modèle Excel
        </Button>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year-exam-module">Module de destination</Label>
            <select id="year-exam-module" required value={moduleId} onChange={event => { setModuleId(event.target.value); setResult(null); }} disabled={busy} className="w-full rounded-md border border-input bg-background p-2 text-sm">
              <option value="">Choisir un module</option>
              {modules.map(module => <option key={module._id} value={module._id}>{module.name}{module.semester ? ` (${module.semester})` : ''}</option>)}
            </select>
            {!modules.length && <p className="text-sm text-muted-foreground">Aucun module disponible. Rechargez la page ou créez un module.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="year-exam-file">Fichier Excel</Label>
            <Input ref={fileInput} id="year-exam-file" type="file" accept=".xlsx,.xls" required disabled={busy} onChange={event => { setFile(event.target.files?.[0] || null); setError(''); setRowErrors([]); setResult(null); }} />
          </div>
          {error && <div role="alert" className="text-sm text-destructive">
            <p>{error}</p>
            {rowErrors.length > 0 && <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5">{rowErrors.map((item, index) => <li key={index}>Ligne {item.row} — {item.field} : {item.message}</li>)}</ul>}
          </div>}
          {result && <p role="status" className="text-sm text-green-700">{result.created} examen(s) créé(s), {result.skipped} doublon(s) ignoré(s).</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy || downloading} onClick={() => { setOpen(false); setFile(null); }}>Fermer</Button>
            <Button type="submit" disabled={!moduleId || !file || busy || downloading}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? 'Import en cours…' : 'Importer les examens'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
