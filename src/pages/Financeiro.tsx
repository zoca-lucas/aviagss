import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, CreditCard, Users, AlertTriangle, Shield, ArrowRight } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Table from '../components/Table';
import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { Expense, Payment, Membership, User, MarginReserve, FinancialDashboard } from '../types';
import { formatCurrency, formatDate, getExpenseCategoryLabel, getPaymentStatusLabel, getDaysUntil, formatPercent } from '../utils/format';
import './Financeiro.css';

const categorias = [
  { value: 'combustivel', label: 'Combustível' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'hangaragem', label: 'Hangaragem' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'taxas', label: 'Taxas' },
  { value: 'pecas', label: 'Peças' },
  { value: 'assinaturas', label: 'Assinaturas' },
  { value: 'outros', label: 'Outros' },
];

const tipos = [
  { value: 'fixo', label: 'Fixo' },
  { value: 'variavel', label: 'Variável' },
];

export default function Financeiro() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [activeTab, setActiveTab] = useState<'despesas' | 'pagamentos' | 'membros'>('despesas');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Partial<Expense>>({});
  const [reserve, setReserve] = useState<MarginReserve | null>(null);
  const [_dashboard, _setDashboard] = useState<FinancialDashboard | null>(null);

  useEffect(() => {
    if (selectedAircraft) {
    loadData();
    }
    setUsers(storage.getUsers());
  }, [selectedAircraft]);

  const loadData = () => {
    if (!selectedAircraft) return;
    setExpenses(storage.getExpenses(selectedAircraft.id).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
    setPayments(storage.getPayments(undefined, selectedAircraft.id));
    setMemberships(storage.getMemberships(selectedAircraft.id));
    
    // Carregar dados de liquidez
    let reserveData = storage.getMarginReserve(selectedAircraft.id);
    if (!reserveData && user) {
      reserveData = storage.initializeMarginReserve(selectedAircraft.id, user.id, user.nome);
    }
    setReserve(reserveData || null);
    _setDashboard(storage.getFinancialDashboard(selectedAircraft.id));
  };

  const handleSaveExpense = () => {
    if (!user || !selectedAircraft || !editingExpense.descricao) return;

    const expense = {
      ...editingExpense,
      aircraftId: selectedAircraft.id,
      moeda: 'BRL',
      rateioAutomatico: editingExpense.rateioAutomatico !== false,
    } as Expense;

    storage.saveExpense(expense, user.id, user.nome);
    loadData();
    setExpenseModalOpen(false);
    setEditingExpense({});
  };

  const handleDeleteExpense = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      storage.deleteExpense(id, user.id, user.nome);
      loadData();
    }
  };

  const handleMarkAsPaid = (payment: Payment) => {
    if (!user) return;
    const updated: Payment = {
      ...payment,
      status: 'pago',
      dataPagamento: new Date().toISOString().split('T')[0],
    };
    storage.savePayment(updated, user.id, user.nome);
      loadData();
  };

  // Estatísticas
  const totalDespesas = expenses.reduce((sum, e) => sum + e.valor, 0);
  const despesasFixas = expenses.filter(e => e.tipo === 'fixo').reduce((sum, e) => sum + e.valor, 0);
  const despesasVariaveis = expenses.filter(e => e.tipo === 'variavel').reduce((sum, e) => sum + e.valor, 0);
  const pagamentosPendentes = payments.filter(p => p.status !== 'pago').reduce((sum, p) => sum + p.valor, 0);

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <DollarSign size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para gerenciar o financeiro.</p>
      </div>
    );
  }

  return (
    <div className="financeiro-page">
      <div className="page-header">
        <div>
          <h1>Financeiro</h1>
          <p className="page-subtitle">Gestão de custos e rateio - {selectedAircraft.prefixo}</p>
        </div>
        {permissions.canManageFinancial && (
          <Button
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingExpense({
                data: new Date().toISOString().split('T')[0],
                tipo: 'variavel',
                categoria: 'outros',
                rateioAutomatico: true,
              });
              setExpenseModalOpen(true);
            }}
          >
          Nova Despesa
        </Button>
        )}
      </div>

      {/* Alerta de Liquidez */}
      {reserve && reserve.status === 'risco_liquidez' && (
        <div className="liquidity-alert critical">
          <div className="alert-content">
            <AlertTriangle size={24} />
            <div className="alert-text">
              <strong>RISCO DE LIQUIDEZ</strong>
              <p>Reserva de Margem: {formatCurrency(reserve.saldoAtual)} / {formatCurrency(reserve.valorMinimoObrigatorio)} (Déficit: {formatCurrency(Math.abs(reserve.excedente))})</p>
            </div>
          </div>
          <Link to="/patrimonio" className="alert-action">
            <span>Gerenciar Reserva</span>
            <ArrowRight size={16} />
          </Link>
      </div>
      )}
      
      {reserve && reserve.status === 'atencao' && (
        <div className="liquidity-alert warning">
          <div className="alert-content">
            <Shield size={24} />
            <div className="alert-text">
              <strong>Atenção com a Reserva</strong>
              <p>Reserva de Margem: {formatCurrency(reserve.saldoAtual)} ({formatPercent(reserve.percentualPreenchimento)} do mínimo)</p>
            </div>
          </div>
          <Link to="/patrimonio" className="alert-action">
            <span>Ver Patrimônio</span>
            <ArrowRight size={16} />
          </Link>
              </div>
            )}

      {/* Resumo */}
      <div className="finance-summary">
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon blue">
              <DollarSign size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(totalDespesas)}</span>
              <span className="summary-label">Total de Despesas</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon green">
              <TrendingDown size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(despesasFixas)}</span>
              <span className="summary-label">Despesas Fixas</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon orange">
              <TrendingUp size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(despesasVariaveis)}</span>
              <span className="summary-label">Despesas Variáveis</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon red">
              <CreditCard size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(pagamentosPendentes)}</span>
              <span className="summary-label">Pendente</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'despesas' ? 'active' : ''}`} onClick={() => setActiveTab('despesas')}>
          <DollarSign size={18} />
          Despesas
        </button>
        <button className={`tab ${activeTab === 'pagamentos' ? 'active' : ''}`} onClick={() => setActiveTab('pagamentos')}>
          <CreditCard size={18} />
          Pagamentos
          {payments.filter(p => p.status !== 'pago').length > 0 && (
            <span className="tab-badge">{payments.filter(p => p.status !== 'pago').length}</span>
          )}
        </button>
        <button className={`tab ${activeTab === 'membros' ? 'active' : ''}`} onClick={() => setActiveTab('membros')}>
          <Users size={18} />
          Extrato dos Membros
        </button>
      </div>

      {/* Conteúdo */}
      {activeTab === 'despesas' && (
        <Card>
          <Table
            columns={[
              { key: 'data', header: 'Data', render: (e) => formatDate(e.data) },
              { key: 'descricao', header: 'Descrição' },
              { key: 'categoria', header: 'Categoria', render: (e) => <Badge>{getExpenseCategoryLabel(e.categoria)}</Badge> },
              { key: 'tipo', header: 'Tipo', render: (e) => <Badge variant={e.tipo === 'fixo' ? 'info' : 'warning'}>{e.tipo === 'fixo' ? 'Fixo' : 'Variável'}</Badge> },
              { key: 'valor', header: 'Valor', align: 'right', render: (e) => formatCurrency(e.valor) },
              {
                key: 'rateio',
                header: 'Rateio',
                render: (e) => e.rateioAutomatico ? <Badge variant="success">Auto</Badge> : <Badge>Manual</Badge>,
              },
              {
                key: 'actions',
                header: '',
                width: '80px',
                render: (e) =>
                  permissions.canManageFinancial && (
                    <div className="table-actions">
                      <button className="action-btn" onClick={() => { setEditingExpense(e); setExpenseModalOpen(true); }}>
                        <Edit size={14} />
                      </button>
                      <button className="action-btn danger" onClick={() => handleDeleteExpense(e.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ),
              },
            ]}
            data={expenses}
            keyExtractor={(e) => e.id}
            emptyMessage="Nenhuma despesa registrada"
          />
        </Card>
      )}

      {activeTab === 'pagamentos' && (
        <Card>
          <Table
            columns={[
              { key: 'dataVencimento', header: 'Vencimento', render: (p) => formatDate(p.dataVencimento) },
              { key: 'membro', header: 'Membro', render: (p) => users.find(u => u.id === p.memberId)?.nome || '-' },
              { key: 'descricao', header: 'Descrição' },
              { key: 'valor', header: 'Valor', align: 'right', render: (p) => formatCurrency(p.valor) },
              {
                key: 'status',
                header: 'Status',
                render: (p) => {
                  const variant = p.status === 'pago' ? 'success' : p.status === 'atrasado' || getDaysUntil(p.dataVencimento) < 0 ? 'danger' : 'warning';
                  return <Badge variant={variant}>{getPaymentStatusLabel(p.status)}</Badge>;
                },
              },
              {
                key: 'actions',
                header: '',
                width: '100px',
                render: (p) =>
                  p.status !== 'pago' && permissions.canManageFinancial && (
                    <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(p)}>
                      Pagar
                    </Button>
                  ),
              },
            ]}
            data={payments}
            keyExtractor={(p) => p.id}
            emptyMessage="Nenhum pagamento registrado"
          />
      </Card>
      )}

      {activeTab === 'membros' && (
        <div className="members-grid">
          {memberships.map((membership) => {
            const member = users.find(u => u.id === membership.userId);
            const balance = storage.getMemberBalance(membership.userId, selectedAircraft.id);
            
            return (
              <Card key={membership.id} className="member-card">
                <div className="member-header">
                  <div className="member-avatar">
                    {member?.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <h3>{member?.nome}</h3>
                    <span>{membership.tipoParticipacao}</span>
                  </div>
                  <Badge variant={membership.status === 'ativo' ? 'success' : 'default'}>
                    {membership.status}
                  </Badge>
                </div>
                <div className="member-stats">
                  <div className="member-stat">
                    <span className="stat-label">Horas Voadas</span>
                    <span className="stat-value">{balance.horasVoadas.toFixed(1)}h</span>
                  </div>
                  <div className="member-stat">
                    <span className="stat-label">Valor Devido</span>
                    <span className="stat-value">{formatCurrency(balance.valorDevido)}</span>
          </div>
                  <div className="member-stat">
                    <span className="stat-label">Valor Pago</span>
                    <span className="stat-value">{formatCurrency(balance.valorPago)}</span>
                      </div>
                  <div className="member-stat">
                    <span className="stat-label">Saldo</span>
                    <span className={`stat-value ${balance.saldo >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(balance.saldo)}
                      </span>
                  </div>
                </div>
              </Card>
            );
          })}
          {memberships.length === 0 && (
            <div className="empty-list full-width">
              <p>Nenhum membro cadastrado</p>
                      </div>
          )}
          </div>
        )}

      {/* Modal de Despesa */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title={editingExpense.id ? 'Editar Despesa' : 'Nova Despesa'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExpenseModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveExpense}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Data"
            type="date"
            value={editingExpense.data || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, data: e.target.value })}
            required
          />
            <Select
              label="Categoria"
              options={categorias}
            value={editingExpense.categoria || 'outros'}
            onChange={(e) => setEditingExpense({ ...editingExpense, categoria: e.target.value as Expense['categoria'] })}
            />
            <Select
              label="Tipo"
            options={tipos}
            value={editingExpense.tipo || 'variavel'}
            onChange={(e) => setEditingExpense({ ...editingExpense, tipo: e.target.value as Expense['tipo'] })}
            />
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
            value={editingExpense.valor || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, valor: parseFloat(e.target.value) })}
              required
            />
          <Input
            label="Data de Vencimento"
            type="date"
            value={editingExpense.dataVencimento || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, dataVencimento: e.target.value })}
          />
          <Input
            label="Fornecedor"
            value={editingExpense.fornecedor || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, fornecedor: e.target.value })}
          />
          </div>
        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Descrição"
            value={editingExpense.descricao || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, descricao: e.target.value })}
            placeholder="Descrição da despesa..."
            required
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={editingExpense.rateioAutomatico !== false}
              onChange={(e) => setEditingExpense({ ...editingExpense, rateioAutomatico: e.target.checked })}
            />
            Aplicar rateio automático entre os membros
          </label>
          </div>
      </Modal>
    </div>
  );
}
