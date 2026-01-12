import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { Document } from '../types';
import { formatDate, getDaysUntil, getDocumentTypeLabel } from '../utils/format';
import './Documentos.css';

const tiposDocumento = [
  { value: 'aeronavegabilidade', label: 'Certificado de Aeronavegabilidade' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'manual', label: 'Manual' },
  { value: 'diario_manutencao', label: 'Diário de Manutenção' },
  { value: 'cma', label: 'CMA' },
  { value: 'licenca', label: 'Licença' },
  { value: 'habilitacao', label: 'Habilitação' },
  { value: 'outros', label: 'Outros' },
];

export default function Documentos() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<Document>>({});
  const [filter, setFilter] = useState<'todos' | 'vencidos' | 'proximos' | 'ok'>('todos');

  useEffect(() => {
    if (selectedAircraft) {
      loadDocuments();
    }
  }, [selectedAircraft]);

  const loadDocuments = () => {
    if (!selectedAircraft) return;
    setDocuments(storage.getDocuments(selectedAircraft.id));
  };

  const handleSave = () => {
    if (!user || !selectedAircraft || !editingDoc.nome) return;

    const doc = {
      ...editingDoc,
      aircraftId: selectedAircraft.id,
    } as Document;

    storage.saveDocument(doc, user.id, user.nome);
    loadDocuments();
    setModalOpen(false);
    setEditingDoc({});
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir este documento?')) {
      storage.deleteDocument(id, user.id, user.nome);
      loadDocuments();
    }
  };

  const getDocStatus = (doc: Document) => {
    if (!doc.dataValidade) return { status: 'ok', label: 'Sem validade', variant: 'default' as const };
    
    const dias = getDaysUntil(doc.dataValidade);
    if (dias <= 0) return { status: 'vencido', label: 'Vencido', variant: 'danger' as const };
    if (dias <= 30) return { status: 'proximo', label: `${dias} dias`, variant: 'warning' as const };
    return { status: 'ok', label: `${dias} dias`, variant: 'success' as const };
  };

  const filteredDocs = documents.filter((doc) => {
    if (filter === 'todos') return true;
    const status = getDocStatus(doc).status;
    if (filter === 'vencidos') return status === 'vencido';
    if (filter === 'proximos') return status === 'proximo';
    if (filter === 'ok') return status === 'ok';
    return true;
  });

  const stats = {
    total: documents.length,
    vencidos: documents.filter(d => getDocStatus(d).status === 'vencido').length,
    proximos: documents.filter(d => getDocStatus(d).status === 'proximo').length,
    ok: documents.filter(d => getDocStatus(d).status === 'ok' && d.dataValidade).length,
  };

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <FileText size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para gerenciar documentos.</p>
      </div>
    );
  }

  return (
    <div className="documentos-page">
      <div className="page-header">
        <div>
          <h1>Documentos</h1>
          <p className="page-subtitle">Gestão de documentos - {selectedAircraft.prefixo}</p>
        </div>
        {permissions.canManageAircraft && (
          <Button
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingDoc({ tipo: 'outros', alertaAntesDias: 30 });
              setModalOpen(true);
            }}
          >
            Novo Documento
          </Button>
        )}
      </div>

      {/* Resumo */}
      <div className="docs-summary">
        <button className={`summary-btn ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
          <span className="summary-count">{stats.total}</span>
          <span className="summary-label">Total</span>
        </button>
        <button className={`summary-btn danger ${filter === 'vencidos' ? 'active' : ''}`} onClick={() => setFilter('vencidos')}>
          <AlertTriangle size={20} />
          <span className="summary-count">{stats.vencidos}</span>
          <span className="summary-label">Vencidos</span>
        </button>
        <button className={`summary-btn warning ${filter === 'proximos' ? 'active' : ''}`} onClick={() => setFilter('proximos')}>
          <Clock size={20} />
          <span className="summary-count">{stats.proximos}</span>
          <span className="summary-label">Próximos</span>
        </button>
        <button className={`summary-btn success ${filter === 'ok' ? 'active' : ''}`} onClick={() => setFilter('ok')}>
          <CheckCircle size={20} />
          <span className="summary-count">{stats.ok}</span>
          <span className="summary-label">OK</span>
        </button>
      </div>

      {/* Lista de Documentos */}
      <div className="docs-grid">
        {filteredDocs.map((doc) => {
          const statusInfo = getDocStatus(doc);
          return (
            <Card key={doc.id} className={`doc-card status-${statusInfo.status}`}>
              <div className="doc-header">
                <div className="doc-icon">
                  <FileText size={24} />
                </div>
                <div className="doc-actions">
                  {permissions.canManageAircraft && (
                    <>
                      <button className="action-btn" onClick={() => { setEditingDoc(doc); setModalOpen(true); }}>
                        <Edit size={16} />
                      </button>
                      <button className="action-btn danger" onClick={() => handleDelete(doc.id)}>
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="doc-info">
                <h3>{doc.nome}</h3>
                <p className="doc-type">{getDocumentTypeLabel(doc.tipo)}</p>
                {doc.numero && <p className="doc-number">Nº {doc.numero}</p>}
              </div>

              <div className="doc-dates">
                {doc.dataEmissao && (
                  <div className="date-item">
                    <span className="date-label">Emissão</span>
                    <span className="date-value">{formatDate(doc.dataEmissao)}</span>
                  </div>
                )}
                {doc.dataValidade && (
                  <div className="date-item">
                    <span className="date-label">Validade</span>
                    <span className="date-value">{formatDate(doc.dataValidade)}</span>
                  </div>
                )}
              </div>

              <div className="doc-footer">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
            </Card>
          );
        })}

        {filteredDocs.length === 0 && (
          <div className="empty-list full-width">
            <p>Nenhum documento encontrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDoc.id ? 'Editar Documento' : 'Novo Documento'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Nome"
            value={editingDoc.nome || ''}
            onChange={(e) => setEditingDoc({ ...editingDoc, nome: e.target.value })}
            placeholder="Nome do documento"
            required
          />
          <Select
            label="Tipo"
            options={tiposDocumento}
            value={editingDoc.tipo || 'outros'}
            onChange={(e) => setEditingDoc({ ...editingDoc, tipo: e.target.value as Document['tipo'] })}
          />
          <Input
            label="Número"
            value={editingDoc.numero || ''}
            onChange={(e) => setEditingDoc({ ...editingDoc, numero: e.target.value })}
          />
          <Input
            label="Data de Emissão"
            type="date"
            value={editingDoc.dataEmissao || ''}
            onChange={(e) => setEditingDoc({ ...editingDoc, dataEmissao: e.target.value })}
          />
          <Input
            label="Data de Validade"
            type="date"
            value={editingDoc.dataValidade || ''}
            onChange={(e) => setEditingDoc({ ...editingDoc, dataValidade: e.target.value })}
          />
          <Input
            label="Alertar antes (dias)"
            type="number"
            value={editingDoc.alertaAntesDias || 30}
            onChange={(e) => setEditingDoc({ ...editingDoc, alertaAntesDias: parseInt(e.target.value) })}
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Descrição"
            value={editingDoc.descricao || ''}
            onChange={(e) => setEditingDoc({ ...editingDoc, descricao: e.target.value })}
            placeholder="Descrição adicional..."
          />
        </div>
      </Modal>
    </div>
  );
}
