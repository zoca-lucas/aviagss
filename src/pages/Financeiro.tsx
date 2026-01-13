import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, CreditCard, Users, AlertTriangle, Shield, ArrowRight, Building2, PieChart } from 'lucide-react';
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
import { Expense, Revenue, BankAccount, Payment, Membership, User, MarginReserve, FinancialDashboard, FinancialApplication } from '../types';
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

const categoriasReceita = [
  { value: 'aplicacao_financeira', label: 'Aplicação Financeira' },
  { value: 'aporte_financeiro', label: 'Aporte Financeiro' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'outras_receitas', label: 'Outras Receitas' },
];

const tipos = [
  { value: 'fixo', label: 'Fixo' },
  { value: 'variavel', label: 'Variável' },
];

export default function Financeiro() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [activeTab, setActiveTab] = useState<'despesas' | 'receitas' | 'contas' | 'aplicacoes' | 'pagamentos' | 'membros'>('despesas');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Partial<Expense>>({});
  const [editingRevenue, setEditingRevenue] = useState<Partial<Revenue>>({});
  const [editingAccount, setEditingAccount] = useState<Partial<BankAccount>>({});
  const [editingApplication, setEditingApplication] = useState<Partial<FinancialApplication>>({});
  const [applications, setApplications] = useState<FinancialApplication[]>([]);
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
    setRevenues(storage.getRevenues(selectedAircraft.id).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
    let accounts = storage.getBankAccounts(selectedAircraft.id);
    
    // Criar conta bancária padrão se não existir
    if (accounts.length === 0 && user) {
      const defaultAccount: BankAccount = {
        id: crypto.randomUUID(),
        aircraftId: selectedAircraft.id,
        nome: 'Conta Principal',
        banco: 'Banco Padrão',
        saldoInicial: 0,
        saldoAtual: 0,
        ativa: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.saveBankAccount(defaultAccount, user.id, user.nome);
      accounts = [defaultAccount];
    }
    
    setBankAccounts(accounts);
    setPayments(storage.getPayments(undefined, selectedAircraft.id));
    setMemberships(storage.getMemberships(selectedAircraft.id));
    
    // Carregar dados de liquidez
    let reserveData = storage.getMarginReserve(selectedAircraft.id);
    if (!reserveData && user) {
      reserveData = storage.initializeMarginReserve(selectedAircraft.id, user.id, user.nome);
    }
    setReserve(reserveData || null);
    
    // Carregar aplicações financeiras
    if (reserveData) {
      setApplications(storage.getFinancialApplications(selectedAircraft.id, reserveData.id));
    }
    _setDashboard(storage.getFinancialDashboard(selectedAircraft.id));
  };

  const handleSaveExpense = () => {
    if (!user || !selectedAircraft || !editingExpense.descricao) return;

    // Validar rateio manual se aplicável
    if (editingExpense.rateioAutomatico === false && editingExpense.rateioManual) {
      const somaRateio = editingExpense.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0);
      const valorTotal = editingExpense.valor || 0;
      const diferenca = Math.abs(somaRateio - valorTotal);
      
      if (diferenca > 0.01) { // Tolerância de 1 centavo
        alert(`A soma dos valores do rateio manual (${somaRateio.toFixed(2)}) deve ser igual ao valor total da despesa (${valorTotal.toFixed(2)}). Diferença: ${diferenca.toFixed(2)}`);
        return;
      }
      
      // Validar que todos os valores foram preenchidos
      const valoresVazios = editingExpense.rateioManual.filter(r => !r.valor || r.valor <= 0);
      if (valoresVazios.length > 0) {
        alert('Todos os valores do rateio manual devem ser preenchidos e maiores que zero.');
        return;
      }
    }

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

  const handleSaveRevenue = () => {
    if (!user || !selectedAircraft || !editingRevenue.descricao || !editingRevenue.contaBancariaId) {
      alert('Preencha todos os campos obrigatórios (Descrição e Conta Bancária)');
      return;
    }

    if (!editingRevenue.valor || editingRevenue.valor <= 0) {
      alert('O valor da receita deve ser maior que zero');
      return;
    }

    // Validar rateio manual se aplicável
    if (editingRevenue.rateioAutomatico === false && editingRevenue.rateioManual) {
      const somaRateio = editingRevenue.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0);
      const valorTotal = editingRevenue.valor || 0;
      const diferenca = Math.abs(somaRateio - valorTotal);
      
      if (diferenca > 0.01) {
        alert(`A soma dos valores do rateio manual (${somaRateio.toFixed(2)}) deve ser igual ao valor total da receita (${valorTotal.toFixed(2)}). Diferença: ${diferenca.toFixed(2)}`);
        return;
      }
      
      const valoresVazios = editingRevenue.rateioManual.filter(r => !r.valor || r.valor <= 0);
      if (valoresVazios.length > 0) {
        alert('Todos os valores do rateio manual devem ser preenchidos e maiores que zero.');
        return;
      }
    }

    const revenue = {
      ...editingRevenue,
      aircraftId: selectedAircraft.id,
      moeda: 'BRL',
      rateioAutomatico: editingRevenue.rateioAutomatico !== false,
    } as Revenue;

    storage.saveRevenue(revenue, user.id, user.nome);
    loadData();
    setRevenueModalOpen(false);
    setEditingRevenue({});
  };

  const handleDeleteRevenue = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      storage.deleteRevenue(id, user.id, user.nome);
      loadData();
    }
  };

  const handleSaveAccount = () => {
    if (!user || !selectedAircraft || !editingAccount.nome || !editingAccount.banco) {
      alert('Preencha todos os campos obrigatórios (Nome e Banco)');
      return;
    }

    const account = {
      ...editingAccount,
      aircraftId: selectedAircraft.id,
      saldoInicial: editingAccount.saldoInicial || 0,
      saldoAtual: editingAccount.saldoAtual !== undefined ? editingAccount.saldoAtual : (editingAccount.saldoInicial || 0),
      ativa: editingAccount.ativa !== false,
    } as BankAccount;

    storage.saveBankAccount(account, user.id, user.nome);
    
    // Recalcular saldo se for edição
    if (account.id) {
      storage.recalculateBankAccountBalance(account.id);
    }
    
    loadData();
    setAccountModalOpen(false);
    setEditingAccount({});
  };

  const handleDeleteAccount = (id: string) => {
    if (!user || !selectedAircraft) return;
    
    // Verificar se há transações vinculadas
    const expensesWithAccount = expenses.filter(e => e.contaBancariaId === id);
    const revenuesWithAccount = revenues.filter(r => r.contaBancariaId === id);
    
    if (expensesWithAccount.length > 0 || revenuesWithAccount.length > 0) {
      alert(`Não é possível excluir esta conta. Existem ${expensesWithAccount.length + revenuesWithAccount.length} transações vinculadas a ela.`);
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir esta conta bancária?')) {
      const accounts = storage.getBankAccounts(selectedAircraft.id);
      const account = accounts.find(a => a.id === id);
      if (account) {
        const updatedAccount = { ...account, ativa: false };
        storage.saveBankAccount(updatedAccount, user.id, user.nome);
        loadData();
      }
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
  const totalReceitas = revenues.reduce((sum, r) => sum + r.valor, 0);
  const resultadoLiquido = totalReceitas - totalDespesas;
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              icon={<Plus size={18} />}
              variant="secondary"
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
            <Button
              icon={<Plus size={18} />}
              onClick={() => {
                setEditingRevenue({
                  data: new Date().toISOString().split('T')[0],
                  categoria: 'outras_receitas',
                  rateioAutomatico: true,
                  moeda: 'BRL',
                });
                setRevenueModalOpen(true);
              }}
            >
              Nova Receita
        </Button>
          </div>
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
            <div className="summary-icon green">
              <TrendingUp size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(totalReceitas)}</span>
              <span className="summary-label">Total de Receitas</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon red">
              <TrendingDown size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(totalDespesas)}</span>
              <span className="summary-label">Total de Despesas</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className={`summary-icon ${resultadoLiquido >= 0 ? 'green' : 'red'}`}>
              <DollarSign size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(resultadoLiquido)}</span>
              <span className="summary-label">Resultado Líquido</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon orange">
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
          <TrendingDown size={18} />
          Despesas
        </button>
        <button className={`tab ${activeTab === 'receitas' ? 'active' : ''}`} onClick={() => setActiveTab('receitas')}>
          <TrendingUp size={18} />
          Receitas
        </button>
        <button className={`tab ${activeTab === 'contas' ? 'active' : ''}`} onClick={() => setActiveTab('contas')}>
          <Building2 size={18} />
          Contas Bancárias
        </button>
        <button className={`tab ${activeTab === 'aplicacoes' ? 'active' : ''}`} onClick={() => setActiveTab('aplicacoes')}>
          <PieChart size={18} />
          Aplicações Financeiras
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

      {activeTab === 'receitas' && (
        <Card>
          <Table
            columns={[
              { key: 'data', header: 'Data', render: (r) => formatDate(r.data) },
              { key: 'descricao', header: 'Descrição' },
              { key: 'categoria', header: 'Categoria', render: (r) => {
                const labels: Record<string, string> = {
                  aplicacao_financeira: 'Aplicação Financeira',
                  aporte_financeiro: 'Aporte Financeiro',
                  reembolso: 'Reembolso',
                  outras_receitas: 'Outras Receitas',
                };
                return <Badge variant="success">{labels[r.categoria] || r.categoria}</Badge>;
              }},
              { key: 'valor', header: 'Valor', align: 'right', render: (r) => formatCurrency(r.valor) },
              { key: 'contaBancariaId', header: 'Conta', render: (r) => {
                const account = bankAccounts.find(a => a.id === r.contaBancariaId);
                return account ? account.nome : '-';
              }},
              {
                key: 'rateio',
                header: 'Rateio',
                render: (r) => r.rateioAutomatico ? <Badge variant="success">Auto</Badge> : <Badge>Manual</Badge>,
              },
              {
                key: 'actions',
                header: '',
                width: '80px',
                render: (r) =>
                  permissions.canManageFinancial && (
                    <div className="table-actions">
                      <button className="action-btn" onClick={() => { setEditingRevenue(r); setRevenueModalOpen(true); }}>
                        <Edit size={14} />
                      </button>
                      <button className="action-btn danger" onClick={() => handleDeleteRevenue(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ),
              },
            ]}
            data={revenues}
            keyExtractor={(r) => r.id}
            emptyMessage="Nenhuma receita registrada"
          />
        </Card>
      )}

      {activeTab === 'contas' && (
        <Card>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Contas Bancárias</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Gerencie as contas bancárias e visualize os saldos atualizados
              </p>
            </div>
            {permissions.canManageFinancial && (
              <Button
                icon={<Plus size={18} />}
                onClick={() => {
                  setEditingAccount({
                    saldoInicial: 0,
                    saldoAtual: 0,
                    ativa: true,
                  });
                  setAccountModalOpen(true);
                }}
              >
                Nova Conta
              </Button>
            )}
          </div>
          <Table
            columns={[
              { key: 'nome', header: 'Nome da Conta' },
              { key: 'banco', header: 'Banco' },
              { key: 'agencia', header: 'Agência', render: (a) => a.agencia || '-' },
              { key: 'conta', header: 'Conta', render: (a) => a.conta || '-' },
              { 
                key: 'saldoAtual', 
                header: 'Saldo Atual', 
                align: 'right',
                render: (a) => (
                  <span style={{ 
                    fontWeight: 600, 
                    color: a.saldoAtual >= 0 ? 'var(--success-color)' : 'var(--danger-color)' 
                  }}>
                    {formatCurrency(a.saldoAtual)}
                  </span>
                )
              },
              {
                key: 'status',
                header: 'Status',
                render: (a) => a.ativa ? <Badge variant="success">Ativa</Badge> : <Badge>Inativa</Badge>,
              },
              {
                key: 'actions',
                header: '',
                width: '80px',
                render: (a) =>
                  permissions.canManageFinancial && (
                    <div className="table-actions">
                      <button 
                        className="action-btn" 
                        onClick={() => {
                          // Recalcular saldo antes de editar
                          storage.recalculateBankAccountBalance(a.id);
                          loadData();
                          setEditingAccount(a);
                          setAccountModalOpen(true);
                        }}
                        title="Editar conta"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="action-btn danger" 
                        onClick={() => handleDeleteAccount(a.id)}
                        title="Desativar conta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ),
              },
            ]}
            data={bankAccounts}
            keyExtractor={(a) => a.id}
            emptyMessage="Nenhuma conta bancária cadastrada"
          />
          
          {/* Resumo de saldos */}
          {bankAccounts.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600 }}>Resumo de Saldos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Saldo Total:</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {formatCurrency(bankAccounts.reduce((sum, a) => sum + a.saldoAtual, 0))}
      </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contas Ativas:</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {bankAccounts.filter(a => a.ativa).length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'aplicacoes' && (
        <Card>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Aplicações Financeiras</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Gerencie as aplicações financeiras da reserva de margem e acompanhe o rendimento
              </p>
              </div>
            {permissions.canManageFinancial && reserve && (
              <Button
                icon={<Plus size={18} />}
                onClick={() => {
                  setEditingApplication({
                    reserveId: reserve.id,
                    dataAplicacao: new Date().toISOString().split('T')[0],
                    liquidez: 'vencimento',
                    ativa: true,
                    taxaRendimento: 0,
                  });
                  setApplicationModalOpen(true);
                }}
              >
                Nova Aplicação
              </Button>
            )}
          </div>

          {/* Resumo de Rendimentos */}
          {reserve && (() => {
            const yieldData = storage.getTotalApplicationYield(selectedAircraft.id);
            return (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600 }}>Resumo de Rendimentos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Aplicado:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {formatCurrency(yieldData.totalAplicado)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Rendimento Acumulado:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success-color)', marginTop: '0.25rem' }}>
                      {formatCurrency(yieldData.totalRendimento)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Valor Atual:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {formatCurrency(yieldData.valorAtual)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Rentabilidade:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: yieldData.totalRendimento >= 0 ? 'var(--success-color)' : 'var(--danger-color)', marginTop: '0.25rem' }}>
                      {yieldData.totalAplicado > 0 ? `${((yieldData.totalRendimento / yieldData.totalAplicado) * 100).toFixed(2)}%` : '0%'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <Table
            columns={[
              { key: 'nome', header: 'Nome da Aplicação' },
              { key: 'tipo', header: 'Tipo' },
              { key: 'instituicao', header: 'Instituição' },
              { key: 'valorAplicado', header: 'Valor Aplicado', align: 'right', render: (a) => formatCurrency(a.valorAplicado) },
              { key: 'taxaRendimento', header: 'Taxa a.a.', align: 'right', render: (a) => `${a.taxaRendimento.toFixed(2)}%` },
              { 
                key: 'rendimento', 
                header: 'Rendimento Atual', 
                align: 'right',
                render: (a) => {
                  const yieldData = storage.calculateApplicationYield(a);
                  return (
                    <div>
                      <div style={{ fontWeight: 600, color: yieldData.rendimentoLiquido >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                        {formatCurrency(yieldData.rendimentoLiquido)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {yieldData.rendimentoPercentual.toFixed(2)}%
                      </div>
                    </div>
                  );
                }
              },
              { 
                key: 'valorAtual', 
                header: 'Valor Atual', 
                align: 'right',
                render: (a) => {
                  const yieldData = storage.calculateApplicationYield(a);
                  return <span style={{ fontWeight: 600 }}>{formatCurrency(yieldData.valorAtual)}</span>;
                }
              },
              {
                key: 'status',
                header: 'Status',
                render: (a) => a.ativa ? <Badge variant="success">Ativa</Badge> : <Badge>Encerrada</Badge>,
              },
              {
                key: 'actions',
                header: '',
                width: '80px',
                render: (a) =>
                  permissions.canManageFinancial && (
                    <div className="table-actions">
                      <button 
                        className="action-btn" 
                        onClick={() => {
                          setEditingApplication(a);
                          setApplicationModalOpen(true);
                        }}
                        title="Editar aplicação"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="action-btn danger" 
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta aplicação?')) {
                            storage.deleteFinancialApplication(a.id, user!.id, user!.nome);
                            loadData();
                          }
                        }}
                        title="Excluir aplicação"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ),
              },
            ]}
            data={applications}
            keyExtractor={(a) => a.id}
            emptyMessage="Nenhuma aplicação financeira registrada"
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
              onChange={(e) => {
                const isAuto = e.target.checked;
                setEditingExpense({ 
                  ...editingExpense, 
                  rateioAutomatico: isAuto,
                  // Se desativar rateio automático, inicializar rateio manual
                  rateioManual: !isAuto && !editingExpense.rateioManual 
                    ? memberships
                        .filter(m => m.status === 'ativo')
                        .map(m => ({
                          memberId: m.userId,
                          grupo: undefined,
                          valor: 0,
                        }))
                    : editingExpense.rateioManual,
                });
              }}
            />
            Aplicar rateio automático entre os membros
          </label>
                      </div>

        {/* Campo Sub-voo: exibir quando categoria = Taxas OU rateio automático = false */}
        {(editingExpense.categoria === 'taxas' || editingExpense.rateioAutomatico === false) && (
          <div style={{ marginTop: '1rem' }}>
            <Input
              label="Sub-voo / Referência do voo"
              value={editingExpense.subVoo || ''}
              onChange={(e) => setEditingExpense({ ...editingExpense, subVoo: e.target.value })}
              placeholder="Ex: SBSP → SBRJ | 02/01/2026"
              required={editingExpense.categoria === 'taxas' || editingExpense.rateioAutomatico === false}
              hint="Identifique a qual voo específico esta despesa se refere"
            />
          </div>
        )}

        {/* Bloco de Rateio Manual: exibir quando rateio automático = false */}
        {editingExpense.rateioAutomatico === false && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Rateio Manual
            </h4>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Informe o valor atribuído a cada grupo/membro. A soma deve ser igual ao valor total da despesa.
            </p>
            
            {editingExpense.rateioManual && editingExpense.rateioManual.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {editingExpense.rateioManual.map((rateio, index) => {
                  const member = users.find(u => u.id === rateio.memberId);
                  const membership = memberships.find(m => m.userId === rateio.memberId);
                  
                  return (
                    <div key={rateio.memberId || index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {member?.nome || 'Membro não encontrado'}
                      </span>
                        {membership && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                            ({membership.tipoParticipacao})
                          </span>
                        )}
                      </div>
                      <div style={{ width: '150px' }}>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rateio.valor || ''}
                          onChange={(e) => {
                            const newRateio = [...(editingExpense.rateioManual || [])];
                            newRateio[index] = { ...newRateio[index], valor: parseFloat(e.target.value) || 0 };
                            setEditingExpense({ ...editingExpense, rateioManual: newRateio });
                          }}
                          placeholder="0,00"
                          required
                        />
                      </div>
                    </div>
                  );
                })}
                
                {/* Validação visual da soma */}
                {editingExpense.valor && editingExpense.rateioManual && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Soma dos valores:
                      </span>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 600,
                        color: (() => {
                          const soma = editingExpense.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0);
                          const diferenca = Math.abs(soma - (editingExpense.valor || 0));
                          return diferenca <= 0.01 ? 'var(--success-color)' : 'var(--danger-color)';
                        })(),
                      }}>
                        {formatCurrency(editingExpense.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0))}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Valor total da despesa:
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {formatCurrency(editingExpense.valor || 0)}
                      </span>
                    </div>
                    {(() => {
                      const soma = editingExpense.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0);
                      const diferenca = Math.abs(soma - (editingExpense.valor || 0));
                      if (diferenca > 0.01) {
                        return (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.25rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)' }}>
                              ⚠️ Diferença: {formatCurrency(diferenca)}. A soma deve ser igual ao valor total.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
          </div>
        )}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Nenhum membro ativo encontrado para rateio.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Receita */}
      <Modal
        isOpen={revenueModalOpen}
        onClose={() => setRevenueModalOpen(false)}
        title={editingRevenue.id ? 'Editar Receita' : 'Nova Receita'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevenueModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRevenue}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Data *"
            type="date"
            value={editingRevenue.data || ''}
            onChange={(e) => setEditingRevenue({ ...editingRevenue, data: e.target.value })}
            required
          />
            <Select
            label="Categoria *"
            options={categoriasReceita}
            value={editingRevenue.categoria || 'outras_receitas'}
            onChange={(e) => setEditingRevenue({ ...editingRevenue, categoria: e.target.value as Revenue['categoria'] })}
          />
          <Input
            label="Valor (R$) *"
            type="number"
            step="0.01"
            min="0.01"
            value={editingRevenue.valor || ''}
            onChange={(e) => setEditingRevenue({ ...editingRevenue, valor: parseFloat(e.target.value) })}
            required
            />
            <Select
            label="Conta Bancária *"
            options={bankAccounts.map(a => ({ value: a.id, label: `${a.nome} (${a.banco})` }))}
            value={editingRevenue.contaBancariaId || ''}
            onChange={(e) => setEditingRevenue({ ...editingRevenue, contaBancariaId: e.target.value })}
            required
            hint="Selecione a conta onde a receita será creditada"
          />
          <Input
            label="Origem do Recurso"
            value={editingRevenue.origem || ''}
            onChange={(e) => setEditingRevenue({ ...editingRevenue, origem: e.target.value })}
            placeholder="Ex: Banco XYZ, Investidor ABC..."
            />
          </div>
        <div style={{ marginTop: '1rem' }}>
            <Input
            label="Descrição *"
            value={editingRevenue.descricao || ''}
            onChange={(e) => setEditingRevenue({ ...editingRevenue, descricao: e.target.value })}
            placeholder="Descrição da receita..."
              required
            />
        </div>
        <div style={{ marginTop: '1rem' }}>
            <Input
            label="Sub-voo / Referência do voo"
            value={editingRevenue.subVoo || ''}
            onChange={(e) => setEditingRevenue({ ...editingRevenue, subVoo: e.target.value })}
            placeholder="Ex: SBSP → SBRJ | 02/01/2026"
            hint="Opcional: identifique a qual voo esta receita se refere"
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={editingRevenue.rateioAutomatico !== false}
              onChange={(e) => {
                const isAuto = e.target.checked;
                setEditingRevenue({ 
                  ...editingRevenue, 
                  rateioAutomatico: isAuto,
                  rateioManual: !isAuto && !editingRevenue.rateioManual 
                    ? memberships
                        .filter(m => m.status === 'ativo')
                        .map(m => ({
                          memberId: m.userId,
                          grupo: undefined,
                          valor: 0,
                        }))
                    : editingRevenue.rateioManual,
                });
              }}
            />
            Aplicar rateio automático entre os membros
          </label>
        </div>

        {/* Bloco de Rateio Manual para Receitas */}
        {editingRevenue.rateioAutomatico === false && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Rateio Manual
            </h4>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Informe o valor atribuído a cada grupo/membro. A soma deve ser igual ao valor total da receita.
            </p>
            
            {editingRevenue.rateioManual && editingRevenue.rateioManual.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {editingRevenue.rateioManual.map((rateio, index) => {
                  const member = users.find(u => u.id === rateio.memberId);
                  const membership = memberships.find(m => m.userId === rateio.memberId);
                  
                  return (
                    <div key={rateio.memberId || index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {member?.nome || 'Membro não encontrado'}
                        </span>
                        {membership && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                            ({membership.tipoParticipacao})
                          </span>
                        )}
                      </div>
                      <div style={{ width: '150px' }}>
                        <Input
              type="number"
              step="0.01"
                          min="0"
                          value={rateio.valor || ''}
                          onChange={(e) => {
                            const newRateio = [...(editingRevenue.rateioManual || [])];
                            newRateio[index] = { ...newRateio[index], valor: parseFloat(e.target.value) || 0 };
                            setEditingRevenue({ ...editingRevenue, rateioManual: newRateio });
                          }}
                          placeholder="0,00"
              required
            />
          </div>
                    </div>
                  );
                })}
                
                {/* Validação visual da soma */}
                {editingRevenue.valor && editingRevenue.rateioManual && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Soma dos valores:
                      </span>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 600,
                        color: (() => {
                          const soma = editingRevenue.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0);
                          const diferenca = Math.abs(soma - (editingRevenue.valor || 0));
                          return diferenca <= 0.01 ? 'var(--success-color)' : 'var(--danger-color)';
                        })(),
                      }}>
                        {formatCurrency(editingRevenue.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0))}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Valor total da receita:
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {formatCurrency(editingRevenue.valor || 0)}
                      </span>
                    </div>
                    {(() => {
                      const soma = editingRevenue.rateioManual.reduce((sum, r) => sum + (r.valor || 0), 0);
                      const diferenca = Math.abs(soma - (editingRevenue.valor || 0));
                      if (diferenca > 0.01) {
                        return (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.25rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)' }}>
                              ⚠️ Diferença: {formatCurrency(diferenca)}. A soma deve ser igual ao valor total.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Nenhum membro ativo encontrado para rateio.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Conta Bancária */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title={editingAccount.id ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccountModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAccount}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Nome da Conta *"
            value={editingAccount.nome || ''}
            onChange={(e) => setEditingAccount({ ...editingAccount, nome: e.target.value })}
            placeholder="Ex: Conta Corrente Principal"
            required
          />
            <Input
            label="Banco *"
            value={editingAccount.banco || ''}
            onChange={(e) => setEditingAccount({ ...editingAccount, banco: e.target.value })}
            placeholder="Ex: Banco do Brasil"
            required
          />
          <Input
            label="Agência"
            value={editingAccount.agencia || ''}
            onChange={(e) => setEditingAccount({ ...editingAccount, agencia: e.target.value })}
            placeholder="0000-0"
          />
          <Input
            label="Conta"
            value={editingAccount.conta || ''}
            onChange={(e) => setEditingAccount({ ...editingAccount, conta: e.target.value })}
            placeholder="00000-0"
          />
          <Input
            label="Saldo Inicial (R$)"
            type="number"
            step="0.01"
            value={editingAccount.saldoInicial || 0}
            onChange={(e) => {
              const saldoInicial = parseFloat(e.target.value) || 0;
              setEditingAccount({ 
                ...editingAccount, 
                saldoInicial,
                saldoAtual: editingAccount.id ? editingAccount.saldoAtual : saldoInicial, // Só atualiza se for nova conta
              });
            }}
            hint={editingAccount.id ? "O saldo atual será recalculado automaticamente" : "Saldo inicial da conta"}
          />
          {editingAccount.id && (
            <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: 'var(--info-bg)', borderRadius: '0.25rem', border: '1px solid var(--info-border)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Saldo Atual:</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: editingAccount.saldoAtual && editingAccount.saldoAtual >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {formatCurrency(editingAccount.saldoAtual || 0)}
          </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                O saldo é calculado automaticamente com base nas receitas e despesas vinculadas a esta conta.
              </div>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editingAccount.ativa !== false}
                onChange={(e) => setEditingAccount({ ...editingAccount, ativa: e.target.checked })}
              />
              Conta ativa
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal de Aplicação Financeira */}
      <Modal
        isOpen={applicationModalOpen}
        onClose={() => setApplicationModalOpen(false)}
        title={editingApplication.id ? 'Editar Aplicação Financeira' : 'Nova Aplicação Financeira'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplicationModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!user || !selectedAircraft || !editingApplication.nome || !editingApplication.instituicao || !editingApplication.valorAplicado || !editingApplication.taxaRendimento) {
                alert('Preencha todos os campos obrigatórios');
                return;
              }
              const application = {
                ...editingApplication,
                aircraftId: selectedAircraft.id,
                reserveId: reserve?.id || '',
                ativa: editingApplication.ativa !== false,
              } as FinancialApplication;
              storage.saveFinancialApplication(application, user.id, user.nome);
              loadData();
              setApplicationModalOpen(false);
              setEditingApplication({});
            }}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Nome da Aplicação *"
            value={editingApplication.nome || ''}
            onChange={(e) => setEditingApplication({ ...editingApplication, nome: e.target.value })}
            placeholder="Ex: CDB Banco XYZ, Tesouro IPCA+"
            required
          />
          <Select
            label="Tipo *"
            options={[
              { value: 'CDB', label: 'CDB' },
              { value: 'LCI', label: 'LCI' },
              { value: 'LCA', label: 'LCA' },
              { value: 'Tesouro Direto', label: 'Tesouro Direto' },
              { value: 'Fundos', label: 'Fundos' },
              { value: 'Poupança', label: 'Poupança' },
              { value: 'Outros', label: 'Outros' },
            ]}
            value={editingApplication.tipo || ''}
            onChange={(e) => setEditingApplication({ ...editingApplication, tipo: e.target.value })}
            required
          />
          <Input
            label="Instituição Financeira *"
            value={editingApplication.instituicao || ''}
            onChange={(e) => setEditingApplication({ ...editingApplication, instituicao: e.target.value })}
            placeholder="Ex: Banco do Brasil, XP Investimentos"
            required
          />
          <Input
            label="Valor Aplicado (R$) *"
            type="number"
            step="0.01"
            min="0.01"
            value={editingApplication.valorAplicado || ''}
            onChange={(e) => setEditingApplication({ ...editingApplication, valorAplicado: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Taxa de Rendimento (% a.a.) *"
            type="number"
            step="0.01"
            min="0"
            value={editingApplication.taxaRendimento || ''}
            onChange={(e) => setEditingApplication({ ...editingApplication, taxaRendimento: parseFloat(e.target.value) })}
            placeholder="Ex: 12.5 para 12,5% a.a."
            required
          />
          <Input
            label="Data de Aplicação *"
            type="date"
            value={editingApplication.dataAplicacao || ''}
            onChange={(e) => setEditingApplication({ ...editingApplication, dataAplicacao: e.target.value })}
            required
          />
          <Input
            label="Data de Vencimento"
            type="date"
            value={editingApplication.dataVencimento || ''}
            onChange={(e) => setEditingApplication({ ...editingApplication, dataVencimento: e.target.value })}
            hint="Opcional: data de vencimento da aplicação"
          />
          <Select
            label="Liquidez"
            options={[
              { value: 'diaria', label: 'Diária' },
              { value: 'vencimento', label: 'No Vencimento' },
              { value: 'd+1', label: 'D+1' },
              { value: 'd+30', label: 'D+30' },
              { value: 'outros', label: 'Outros' },
            ]}
            value={editingApplication.liquidez || 'vencimento'}
            onChange={(e) => setEditingApplication({ ...editingApplication, liquidez: e.target.value as FinancialApplication['liquidez'] })}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Observações"
              value={editingApplication.observacoes || ''}
              onChange={(e) => setEditingApplication({ ...editingApplication, observacoes: e.target.value })}
              placeholder="Informações adicionais sobre a aplicação"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editingApplication.ativa !== false}
                onChange={(e) => setEditingApplication({ ...editingApplication, ativa: e.target.checked })}
              />
              Aplicação ativa
            </label>
          </div>
          
          {/* Preview de Rendimento */}
          {editingApplication.valorAplicado && editingApplication.taxaRendimento && editingApplication.dataAplicacao && (
            <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: 'var(--info-bg)', borderRadius: '0.25rem', border: '1px solid var(--info-border)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Previsão de Rendimento:</div>
              {(() => {
                const tempApp = {
                  ...editingApplication,
                  valorAplicado: editingApplication.valorAplicado || 0,
                  taxaRendimento: editingApplication.taxaRendimento || 0,
                  dataAplicacao: editingApplication.dataAplicacao || new Date().toISOString().split('T')[0],
                } as FinancialApplication;
                const yieldData = storage.calculateApplicationYield(tempApp);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Dias decorridos:</span>
                      <div style={{ fontWeight: 600 }}>{yieldData.diasDecorridos} dias</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Rendimento líquido:</span>
                      <div style={{ fontWeight: 600, color: 'var(--success-color)' }}>{formatCurrency(yieldData.rendimentoLiquido)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Valor atual estimado:</span>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(yieldData.valorAtual)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Rentabilidade:</span>
                      <div style={{ fontWeight: 600, color: 'var(--success-color)' }}>{yieldData.rendimentoPercentual.toFixed(2)}%</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
