import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Eye, X } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Table from '../components/Table';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { spreadsheetImporter, ImportResult } from '../services/spreadsheetImporter';
import './Importacao.css';

export default function Importacao() {
  const { user } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [importOptions, setImportOptions] = useState({
    importFlights: true,
    importExpenses: true,
    importRevenues: true,
    filterMonth: 12, // Dezembro
    filterYear: new Date().getFullYear(),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    console.log('Arquivo selecionado:', selectedFile.name);
    setFile(selectedFile);
    setImportResult(null);
    setPreview(null); // Limpar preview anterior

    // Fazer preview
    try {
      console.log('Gerando preview...');
      const previewData = await spreadsheetImporter.previewSpreadsheet(selectedFile, 10);
      console.log('Preview gerado:', previewData);
      setPreview(previewData);
    } catch (error: any) {
      console.error('Erro ao gerar preview:', error);
      alert(`Erro ao ler arquivo: ${error.message}`);
      setFile(null);
      setPreview(null);
    }
  };

  const handleImport = async () => {
    console.log('handleImport chamado', { file, user, selectedAircraft, preview });
    
    if (!file || !user || !selectedAircraft) {
      alert('Selecione um arquivo e uma aeronave');
      return;
    }

    if (!preview) {
      alert('Erro: Preview dos dados não disponível. Tente selecionar o arquivo novamente.');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      console.log('Iniciando importação...', importOptions);
      const result = await spreadsheetImporter.importSpreadsheet(
        file,
        selectedAircraft.id,
        user.id,
        importOptions
      );

      console.log('Resultado da importação:', result);
      setImportResult(result);
      
      if (result.success) {
        alert(`Importação concluída!\n\nVoos: ${result.imported.flights}\nDespesas: ${result.imported.expenses}\nReceitas: ${result.imported.revenues}`);
        // Recarregar dados
        setTimeout(() => {
          window.location.reload(); // Recarrega para atualizar todos os módulos
        }, 2000);
      } else {
        alert(`Erro na importação:\n${result.errors.join('\n')}`);
      }
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      setImportResult({
        success: false,
        imported: { flights: 0, expenses: 0, revenues: 0 },
        errors: [error.message || 'Erro desconhecido ao importar'],
        warnings: [],
      });
      alert(`Erro ao importar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <FileSpreadsheet size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para importar dados.</p>
      </div>
    );
  }

  return (
    <div className="importacao-page">
      <div className="page-header">
        <div>
          <h1>Importação de Dados</h1>
          <p className="page-subtitle">
            Importe voos, despesas e receitas da sua planilha - {selectedAircraft.prefixo}
          </p>
        </div>
      </div>

      <Card>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
            Upload de Planilha
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Suporta arquivos CSV e Excel (.xlsx, .xls). Os dados serão mapeados automaticamente.
          </p>
        </div>

        <div style={{ 
          border: '2px dashed var(--border-color)', 
          borderRadius: '0.5rem', 
          padding: '2rem',
          textAlign: 'center',
          background: file ? 'var(--bg-secondary)' : 'transparent',
          transition: 'all 0.2s',
        }}>
          {!file ? (
            <>
              <Upload size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
              <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)' }}>
                Arraste o arquivo aqui ou clique para selecionar
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <Button icon={<FileSpreadsheet size={18} />}>
                  Selecionar Arquivo
                </Button>
              </label>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FileSpreadsheet size={24} style={{ color: 'var(--success-color)' }} />
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setImportResult(null);
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '0.25rem',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              {preview && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {preview.totalRows} linhas encontradas • {preview.headers.length} colunas
                </div>
              )}
            </div>
          )}
        </div>

        {preview && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Preview dos Dados</h4>
              <Button
                variant="secondary"
                size="sm"
                icon={<Eye size={14} />}
                onClick={() => setPreviewModalOpen(true)}
              >
                Ver Preview Completo
              </Button>
            </div>
            <div style={{ 
              maxHeight: '200px', 
              overflow: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                  <tr>
                    {preview.headers.slice(0, 6).map((header: string, idx: number) => (
                      <th key={idx} style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row: any, rowIdx: number) => (
                    <tr key={rowIdx}>
                      {preview.headers.slice(0, 6).map((header: string, colIdx: number) => (
                        <td key={colIdx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                          {String(row[header] || '').substring(0, 30)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.totalRows > 5 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Mostrando 5 de {preview.totalRows} linhas
              </p>
            )}
          </div>
        )}

        {preview && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Opções de Importação</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={importOptions.importFlights}
                  onChange={(e) => setImportOptions({ ...importOptions, importFlights: e.target.checked })}
                />
                <span>Importar Voos</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={importOptions.importExpenses}
                  onChange={(e) => setImportOptions({ ...importOptions, importExpenses: e.target.checked })}
                />
                <span>Importar Despesas</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={importOptions.importRevenues}
                  onChange={(e) => setImportOptions({ ...importOptions, importRevenues: e.target.checked })}
                />
                <span>Importar Receitas</span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Filtrar por Mês
                </label>
                <select
                  value={importOptions.filterMonth || ''}
                  onChange={(e) => setImportOptions({ ...importOptions, filterMonth: e.target.value ? parseInt(e.target.value) : 12 })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)' }}
                >
                  <option value="">Todos os meses</option>
                  <option value="1">Janeiro</option>
                  <option value="2">Fevereiro</option>
                  <option value="3">Março</option>
                  <option value="4">Abril</option>
                  <option value="5">Maio</option>
                  <option value="6">Junho</option>
                  <option value="7">Julho</option>
                  <option value="8">Agosto</option>
                  <option value="9">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Filtrar por Ano
                </label>
                <input
                  type="number"
                  value={importOptions.filterYear || new Date().getFullYear()}
                  onChange={(e) => setImportOptions({ ...importOptions, filterYear: e.target.value ? parseInt(e.target.value) : new Date().getFullYear() })}
                  placeholder="Ex: 2024"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>
          </div>
        )}

        {importResult && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            background: importResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${importResult.success ? 'var(--success-color)' : 'var(--danger-color)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {importResult.success ? (
                <CheckCircle2 size={20} style={{ color: 'var(--success-color)' }} />
              ) : (
                <AlertTriangle size={20} style={{ color: 'var(--danger-color)' }} />
              )}
              <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
                {importResult.success ? 'Importação Concluída' : 'Erros na Importação'}
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Voos:</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{importResult.imported.flights}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Despesas:</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{importResult.imported.expenses}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Receitas:</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{importResult.imported.revenues}</div>
              </div>
            </div>

            {importResult.warnings.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ fontSize: '0.875rem' }}>Avisos:</strong>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                  {importResult.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ fontSize: '0.875rem', color: 'var(--danger-color)' }}>Erros:</strong>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.5rem', fontSize: '0.875rem', color: 'var(--danger-color)' }}>
                  {importResult.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {file && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setImportResult(null);
              }}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botão clicado!', { loading, preview, file, user, selectedAircraft });
                if (!preview) {
                  alert('Erro: Preview dos dados não disponível. Tente selecionar o arquivo novamente.');
                  return;
                }
                handleImport();
              }}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: loading ? 'var(--text-secondary)' : 'var(--accent-color)',
                color: 'white',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9375rem',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinning" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Importar Dados
                </>
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Modal de Preview Completo */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Preview Completo da Planilha"
        size="lg"
      >
        {preview && (
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <Table
              columns={preview.headers.map((header: string) => ({
                key: header,
                header: header,
                render: (row: any) => String(row[header] || '').substring(0, 50),
              }))}
              data={preview.rows}
              keyExtractor={(_: any, index?: number) => `row-${index ?? 0}`}
              emptyMessage="Nenhum dado encontrado"
            />
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Mostrando {preview.rows.length} de {preview.totalRows} linhas
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
