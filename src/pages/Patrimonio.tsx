import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Building2, PiggyBank, TrendingUp, Users, 
  AlertTriangle, Shield, DollarSign, FileText, Percent, Calendar,
  ArrowUpRight, ArrowDownRight, Wallet, BarChart3
} from 'lucide-react';
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
import { 
  AircraftAsset, 
  AssetInvestment, 
  MarginReserve, 
  MarginReserveMovement,
  FinancialDashboard,
  User,
  Membership
} from '../types';
import { formatCurrency, formatDate, formatPercent } from '../utils/format';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import './Patrimonio.css';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const assetTypes = [
  { value: 'imobilizado', label: 'Imobilizado' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'outros', label: 'Outros' },
];

const assetStatuses = [
  { value: 'em_construcao', label: 'Em Construção' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'em_uso', label: 'Em Uso' },
  { value: 'baixado', label: 'Baixado' },
];

const movementTypes = [
  { value: 'aporte', label: 'Aporte' },
  { value: 'uso_emergencial', label: 'Uso Emergencial' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'rendimento', label: 'Rendimento' },
];

export default function Patrimonio() {
  const { user, permissions } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'reserva_margem' | 'ativos' | 'participacao'>('visao_geral');
  
  // Estados
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [reserve, setReserve] = useState<MarginReserve | null>(null);
  const [movements, setMovements] = useState<MarginReserveMovement[]>([]);
  const [assets, setAssets] = useState<AircraftAsset[]>([]);
  const [investments, setInvestments] = useState<AssetInvestment[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Modais
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [investmentModalOpen, setInvestmentModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  
  // Edição
  const [editingAsset, setEditingAsset] = useState<Partial<AircraftAsset>>({});
  const [editingInvestment, setEditingInvestment] = useState<Partial<AssetInvestment>>({});
  const [editingMovement, setEditingMovement] = useState<Partial<MarginReserveMovement>>({});
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');

  useEffect(() => {
    if (selectedAircraft) {
      loadData();
    }
    setUsers(storage.getUsers());
  }, [selectedAircraft]);

  const loadData = () => {
    if (!selectedAircraft) return;
    
    setDashboard(storage.getFinancialDashboard(selectedAircraft.id));
    
    let reserveData = storage.getMarginReserve(selectedAircraft.id);
    if (!reserveData && user) {
      // Inicializar reserva se não existir
      reserveData = storage.initializeMarginReserve(selectedAircraft.id, user.id, user.nome);
    }
    setReserve(reserveData || null);
    
    setMovements(storage.getMarginReserveMovements(undefined, selectedAircraft.id));
    setAssets(storage.getAircraftAssets(selectedAircraft.id));
    setInvestments(storage.getAssetInvestments(undefined, selectedAircraft.id));
    setMemberships(storage.getMemberships(selectedAircraft.id));
  };

  // Handlers para Reserva de Margem
  const handleSaveMovement = () => {
    if (!user || !selectedAircraft || !reserve) return;
    
    try {
      if (editingMovement.tipo === 'uso_emergencial' && !editingMovement.justificativa) {
        alert('Justificativa é obrigatória para uso emergencial');
        return;
      }
      
      const movement: MarginReserveMovement = {
        ...editingMovement,
        reserveId: reserve.id,
        aircraftId: selectedAircraft.id,
        data: editingMovement.data || new Date().toISOString().split('T')[0],
      } as MarginReserveMovement;
      
      storage.saveMarginReserveMovement(movement, user.id, user.nome);
      loadData();
      setMovementModalOpen(false);
      setEditingMovement({});
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Handlers para Ativos
  const handleSaveAsset = () => {
    if (!user || !selectedAircraft || !editingAsset.nome) return;
    
    const asset: AircraftAsset = {
      ...editingAsset,
      aircraftId: selectedAircraft.id,
      participacaoSocios: editingAsset.participacaoSocios || [],
    } as AircraftAsset;
    
    storage.saveAircraftAsset(asset, user.id, user.nome);
    loadData();
    setAssetModalOpen(false);
    setEditingAsset({});
  };

  const handleDeleteAsset = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir este ativo?')) {
      storage.deleteAircraftAsset(id, user.id, user.nome);
      loadData();
    }
  };

  // Handlers para Investimentos
  const handleSaveInvestment = () => {
    if (!user || !selectedAircraft || !selectedAssetId || !editingInvestment.valor) return;
    
    // Calcular rateio entre sócios
    const activeMemberships = memberships.filter(m => m.status === 'ativo');
    const rateioPorSocio = activeMemberships.map(m => {
      const percentual = m.cotaPercentual || (100 / activeMemberships.length);
      return {
        socioId: m.userId,
        percentual,
        valor: (editingInvestment.valor || 0) * (percentual / 100),
      };
    });
    
    const investment: AssetInvestment = {
      ...editingInvestment,
      assetId: selectedAssetId,
      aircraftId: selectedAircraft.id,
      rateioPorSocio,
    } as AssetInvestment;
    
    storage.saveAssetInvestment(investment, user.id, user.nome);
    loadData();
    setInvestmentModalOpen(false);
    setEditingInvestment({});
    setSelectedAssetId('');
  };

  // Dados para gráficos
  const patrimonioData = reserve && dashboard ? [
    { name: 'Caixa Operacional', value: Math.max(0, dashboard.caixaOperacional), color: COLORS[0] },
    { name: 'Reserva de Margem', value: reserve.saldoAtual, color: COLORS[1] },
    { name: 'Ativos Imobilizados', value: dashboard.patrimonioAtivos.valorTotal, color: COLORS[2] },
  ].filter(d => d.value > 0) : [];

  const participacaoData = storage.getPatrimonyBySocio(selectedAircraft?.id || '');

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <Building2 size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para gerenciar o patrimônio.</p>
      </div>
    );
  }

  return (
    <div className="patrimonio-page">
      <div className="page-header">
        <div>
          <h1>Patrimônio</h1>
          <p className="page-subtitle">Gestão patrimonial e liquidez - {selectedAircraft.prefixo}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'visao_geral' ? 'active' : ''}`} onClick={() => setActiveTab('visao_geral')}>
          <BarChart3 size={18} />
          Visão Geral
        </button>
        <button className={`tab ${activeTab === 'reserva_margem' ? 'active' : ''}`} onClick={() => setActiveTab('reserva_margem')}>
          <Shield size={18} />
          Reserva de Margem
          {reserve?.status === 'risco_liquidez' && (
            <span className="tab-badge danger">!</span>
          )}
        </button>
        <button className={`tab ${activeTab === 'ativos' ? 'active' : ''}`} onClick={() => setActiveTab('ativos')}>
          <Building2 size={18} />
          Ativos
        </button>
        <button className={`tab ${activeTab === 'participacao' ? 'active' : ''}`} onClick={() => setActiveTab('participacao')}>
          <Users size={18} />
          Participação por Sócio
        </button>
      </div>

      {/* Visão Geral */}
      {activeTab === 'visao_geral' && dashboard && reserve && (
        <div className="overview-content">
          {/* Cards de Resumo */}
          <div className="overview-summary">
            <Card className="summary-card">
              <div className="summary-content">
                <div className="summary-icon blue">
                  <Wallet size={24} />
                </div>
                <div className="summary-info">
                  <span className="summary-value">{formatCurrency(dashboard.caixaTotal)}</span>
                  <span className="summary-label">Caixa Total</span>
                </div>
              </div>
            </Card>
            <Card className="summary-card">
              <div className="summary-content">
                <div className="summary-icon green">
                  <DollarSign size={24} />
                </div>
                <div className="summary-info">
                  <span className="summary-value">{formatCurrency(dashboard.caixaOperacional)}</span>
                  <span className="summary-label">Caixa Operacional</span>
                </div>
              </div>
            </Card>
            <Card className={`summary-card ${reserve.status === 'risco_liquidez' ? 'danger' : reserve.status === 'atencao' ? 'warning' : ''}`}>
              <div className="summary-content">
                <div className={`summary-icon ${reserve.status === 'risco_liquidez' ? 'red' : reserve.status === 'atencao' ? 'orange' : 'green'}`}>
                  <Shield size={24} />
                </div>
                <div className="summary-info">
                  <span className="summary-value">{formatCurrency(reserve.saldoAtual)}</span>
                  <span className="summary-label">Reserva de Margem</span>
                </div>
              </div>
              {reserve.status === 'risco_liquidez' && (
                <div className="card-alert">
                  <AlertTriangle size={14} />
                  <span>RISCO DE LIQUIDEZ</span>
                </div>
              )}
            </Card>
            <Card className="summary-card">
              <div className="summary-content">
                <div className="summary-icon purple">
                  <Building2 size={24} />
                </div>
                <div className="summary-info">
                  <span className="summary-value">{formatCurrency(dashboard.patrimonioAtivos.valorTotal)}</span>
                  <span className="summary-label">Ativos Imobilizados</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Indicadores */}
          <div className="indicators-grid">
            <Card title="Cobertura da Reserva de Margem">
              <div className="indicator-value-large">
                <span className={reserve.percentualPreenchimento < 100 ? 'danger' : reserve.percentualPreenchimento < 110 ? 'warning' : 'success'}>
                  {formatPercent(reserve.percentualPreenchimento)}
                </span>
                <small>Meta: 100% (R$ {reserve.valorMinimoObrigatorio.toLocaleString('pt-BR')})</small>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${reserve.percentualPreenchimento < 100 ? 'danger' : reserve.percentualPreenchimento < 110 ? 'warning' : 'success'}`}
                  style={{ width: `${Math.min(reserve.percentualPreenchimento, 100)}%` }}
                />
              </div>
              {reserve.excedente < 0 && (
                <div className="deficit-alert">
                  <AlertTriangle size={16} />
                  Déficit: {formatCurrency(Math.abs(reserve.excedente))}
                </div>
              )}
              {reserve.excedente > 0 && (
                <div className="surplus-info">
                  <TrendingUp size={16} />
                  Excedente: {formatCurrency(reserve.excedente)}
                </div>
              )}
            </Card>

            <Card title="Composição Patrimonial">
              {patrimonioData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={patrimonioData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {patrimonioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="empty-message">Nenhum dado disponível</p>
              )}
            </Card>

            <Card title="Patrimônio Total">
              <div className="patrimonio-total">
                <div className="patrimonio-total-value">
                  {formatCurrency(dashboard.indicadores.patrimonioTotal)}
                </div>
                <div className="patrimonio-breakdown">
                  <div className="breakdown-item">
                    <span>Caixa (Operacional + Reserva)</span>
                    <span>{formatCurrency(dashboard.caixaTotal)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Ativos Imobilizados</span>
                    <span>{formatCurrency(dashboard.patrimonioAtivos.valorTotal)}</span>
                  </div>
                  {dashboard.patrimonioAtivos.emConstrucao > 0 && (
                    <div className="breakdown-item sub">
                      <span>• Em Construção</span>
                      <span>{formatCurrency(dashboard.patrimonioAtivos.emConstrucao)}</span>
                    </div>
                  )}
                  {dashboard.patrimonioAtivos.concluido > 0 && (
                    <div className="breakdown-item sub">
                      <span>• Concluídos</span>
                      <span>{formatCurrency(dashboard.patrimonioAtivos.concluido)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Reserva de Margem */}
      {activeTab === 'reserva_margem' && reserve && (
        <div className="reserve-content">
          {/* Status da Reserva */}
          <Card className={`reserve-status-card ${reserve.status}`}>
            <div className="reserve-header">
              <div className="reserve-info">
                <h2>Reserva de Margem</h2>
                <p>Conta separada para garantir liquidez mínima - Não entra no caixa operacional</p>
              </div>
              <Badge 
                variant={reserve.status === 'normal' ? 'success' : reserve.status === 'atencao' ? 'warning' : 'danger'}
                size="lg"
              >
                {reserve.status === 'normal' ? 'NORMAL' : reserve.status === 'atencao' ? 'ATENÇÃO' : 'RISCO DE LIQUIDEZ'}
              </Badge>
            </div>
            
            <div className="reserve-stats">
              <div className="reserve-stat">
                <span className="stat-label">Saldo Atual</span>
                <span className={`stat-value ${reserve.saldoAtual >= reserve.valorMinimoObrigatorio ? 'positive' : 'negative'}`}>
                  {formatCurrency(reserve.saldoAtual)}
                </span>
              </div>
              <div className="reserve-stat">
                <span className="stat-label">Mínimo Obrigatório</span>
                <span className="stat-value">{formatCurrency(reserve.valorMinimoObrigatorio)}</span>
              </div>
              <div className="reserve-stat">
                <span className="stat-label">{reserve.excedente >= 0 ? 'Excedente' : 'Déficit'}</span>
                <span className={`stat-value ${reserve.excedente >= 0 ? 'positive' : 'negative'}`}>
                  {reserve.excedente >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {formatCurrency(Math.abs(reserve.excedente))}
                </span>
              </div>
              <div className="reserve-stat">
                <span className="stat-label">% Preenchimento</span>
                <span className={`stat-value ${reserve.percentualPreenchimento >= 100 ? 'positive' : 'negative'}`}>
                  {formatPercent(reserve.percentualPreenchimento)}
                </span>
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="reserve-actions">
                <Button 
                  icon={<Plus size={18} />}
                  onClick={() => {
                    setEditingMovement({ tipo: 'aporte', valor: 0 });
                    setMovementModalOpen(true);
                  }}
                >
                  Registrar Aporte
                </Button>
                <Button 
                  variant="danger"
                  icon={<AlertTriangle size={18} />}
                  onClick={() => {
                    setEditingMovement({ tipo: 'uso_emergencial', valor: 0 });
                    setMovementModalOpen(true);
                  }}
                >
                  Uso Emergencial
                </Button>
              </div>
            )}
          </Card>

          {/* Regras */}
          <Card title="Regras da Reserva de Margem" className="rules-card">
            <ul className="rules-list">
              <li>
                <Shield size={16} />
                <span>A reserva de <strong>R$ 200.000,00</strong> deve estar sempre disponível em conta separada.</span>
              </li>
              <li>
                <DollarSign size={16} />
                <span>Este valor <strong>não entra no cálculo de caixa operacional</strong> e não pode ser usado para despesas comuns.</span>
              </li>
              <li>
                <Users size={16} />
                <span>Somente <strong>administradores</strong> podem movimentar esta reserva.</span>
              </li>
              <li>
                <AlertTriangle size={16} />
                <span>Uso emergencial requer <strong>justificativa obrigatória</strong> e fica registrado na auditoria.</span>
              </li>
            </ul>
          </Card>

          {/* Histórico de Movimentações */}
          <Card title="Histórico de Movimentações">
            {movements.length > 0 ? (
              <Table
                columns={[
                  { key: 'data', header: 'Data', render: (m) => formatDate(m.data) },
                  { 
                    key: 'tipo', 
                    header: 'Tipo', 
                    render: (m) => (
                      <Badge variant={m.tipo === 'aporte' ? 'success' : m.tipo === 'uso_emergencial' ? 'danger' : 'info'}>
                        {movementTypes.find(t => t.value === m.tipo)?.label || m.tipo}
                      </Badge>
                    )
                  },
                  { 
                    key: 'valor', 
                    header: 'Valor', 
                    align: 'right',
                    render: (m) => (
                      <span className={m.valor >= 0 ? 'positive' : 'negative'}>
                        {m.valor >= 0 ? '+' : ''}{formatCurrency(m.valor)}
                      </span>
                    )
                  },
                  { key: 'saldoApos', header: 'Saldo Após', align: 'right', render: (m) => formatCurrency(m.saldoApos) },
                  { key: 'observacoes', header: 'Observações', render: (m) => m.justificativa || m.observacoes || '-' },
                ]}
                data={movements}
                keyExtractor={(m) => m.id}
              />
            ) : (
              <p className="empty-message">Nenhuma movimentação registrada</p>
            )}
          </Card>
        </div>
      )}

      {/* Ativos */}
      {activeTab === 'ativos' && (
        <div className="assets-content">
          <div className="section-header">
            <h2>Ativos Patrimoniais</h2>
            {user?.role === 'admin' && (
              <Button 
                icon={<Plus size={18} />}
                onClick={() => {
                  setEditingAsset({
                    tipo: 'imobilizado',
                    status: 'em_construcao',
                    valorEstimadoTotal: 0,
                  });
                  setAssetModalOpen(true);
                }}
              >
                Novo Ativo
              </Button>
            )}
          </div>

          {assets.length > 0 ? (
            <div className="assets-grid">
              {assets.map(asset => (
                <Card key={asset.id} className={`asset-card ${asset.status}`}>
                  <div className="asset-header">
                    <div className="asset-icon">
                      <Building2 size={24} />
                    </div>
                    <div className="asset-title">
                      <h3>{asset.nome}</h3>
                      <Badge variant={asset.status === 'concluido' ? 'success' : asset.status === 'em_construcao' ? 'warning' : 'info'}>
                        {assetStatuses.find(s => s.value === asset.status)?.label || asset.status}
                      </Badge>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="asset-actions">
                        <button className="action-btn" onClick={() => { setEditingAsset(asset); setAssetModalOpen(true); }}>
                          <Edit size={14} />
                        </button>
                        <button className="action-btn danger" onClick={() => handleDeleteAsset(asset.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="asset-progress">
                    <div className="progress-header">
                      <span>Execução</span>
                      <span>{formatPercent(asset.percentualExecucao)}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min(asset.percentualExecucao, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="asset-values">
                    <div className="value-item">
                      <span className="value-label">Investido</span>
                      <span className="value-amount">{formatCurrency(asset.valorInvestidoAtual)}</span>
                    </div>
                    <div className="value-item">
                      <span className="value-label">Orçamento Total</span>
                      <span className="value-amount">{formatCurrency(asset.valorEstimadoTotal)}</span>
                    </div>
                  </div>

                  {asset.participacaoSocios.length > 0 && (
                    <div className="asset-shareholders">
                      <h4>Participação</h4>
                      {asset.participacaoSocios.map(p => (
                        <div key={p.socioId} className="shareholder-item">
                          <span>{p.socioNome}</span>
                          <span>{formatPercent(p.percentual)} ({formatCurrency(p.valorInvestido)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {user?.role === 'admin' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      icon={<Plus size={14} />}
                      onClick={() => {
                        setSelectedAssetId(asset.id);
                        setEditingInvestment({
                          data: new Date().toISOString().split('T')[0],
                          valor: 0,
                        });
                        setInvestmentModalOpen(true);
                      }}
                    >
                      Registrar Investimento
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="empty-card">
              <Building2 size={48} className="empty-icon" />
              <h3>Nenhum ativo cadastrado</h3>
              <p>Cadastre ativos patrimoniais como hangares, veículos ou equipamentos.</p>
              {user?.role === 'admin' && (
                <Button 
                  icon={<Plus size={18} />}
                  onClick={() => {
                    setEditingAsset({
                      tipo: 'imobilizado',
                      status: 'em_construcao',
                      valorEstimadoTotal: 0,
                    });
                    setAssetModalOpen(true);
                  }}
                >
                  Cadastrar Primeiro Ativo
                </Button>
              )}
            </Card>
          )}

          {/* Histórico de Investimentos */}
          {investments.length > 0 && (
            <Card title="Histórico de Investimentos (CAPEX)" className="investments-history">
              <Table
                columns={[
                  { key: 'data', header: 'Data', render: (i) => formatDate(i.data) },
                  { key: 'ativo', header: 'Ativo', render: (i) => assets.find(a => a.id === i.assetId)?.nome || '-' },
                  { key: 'descricao', header: 'Descrição' },
                  { key: 'valor', header: 'Valor', align: 'right', render: (i) => formatCurrency(i.valor) },
                  { key: 'fornecedor', header: 'Fornecedor', render: (i) => i.fornecedor || '-' },
                ]}
                data={investments}
                keyExtractor={(i) => i.id}
              />
            </Card>
          )}
        </div>
      )}

      {/* Participação por Sócio */}
      {activeTab === 'participacao' && (
        <div className="participation-content">
          <Card title="Patrimônio por Sócio">
            {participacaoData.length > 0 ? (
              <>
                <div className="participation-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={participacaoData} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis type="category" dataKey="socioNome" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="valorAeronave" name="Cota Aeronave" fill={COLORS[0]} stackId="a" />
                      <Bar dataKey="valorAtivos" name="Ativos" fill={COLORS[2]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <Table
                  columns={[
                    { key: 'socioNome', header: 'Sócio' },
                    { key: 'valorAeronave', header: 'Cota Aeronave', align: 'right', render: (p) => formatCurrency(p.valorAeronave) },
                    { key: 'valorAtivos', header: 'Em Ativos', align: 'right', render: (p) => formatCurrency(p.valorAtivos) },
                    { key: 'valorTotal', header: 'Total', align: 'right', render: (p) => <strong>{formatCurrency(p.valorTotal)}</strong> },
                    { key: 'percentualTotal', header: '% do Patrimônio', align: 'right', render: (p) => formatPercent(p.percentualTotal) },
                  ]}
                  data={participacaoData}
                  keyExtractor={(p) => p.socioId}
                />
              </>
            ) : (
              <p className="empty-message">Nenhum sócio cadastrado com participação</p>
            )}
          </Card>
        </div>
      )}

      {/* Modal de Movimentação */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title={editingMovement.tipo === 'uso_emergencial' ? 'Uso Emergencial da Reserva' : 'Registrar Movimentação'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMovementModalOpen(false)}>Cancelar</Button>
            <Button 
              variant={editingMovement.tipo === 'uso_emergencial' ? 'danger' : 'primary'}
              onClick={handleSaveMovement}
            >
              {editingMovement.tipo === 'uso_emergencial' ? 'Confirmar Uso' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Select
            label="Tipo"
            options={movementTypes}
            value={editingMovement.tipo || 'aporte'}
            onChange={(e) => setEditingMovement({ ...editingMovement, tipo: e.target.value as any })}
            disabled={editingMovement.tipo === 'uso_emergencial'}
          />
          <Input
            label="Data"
            type="date"
            value={editingMovement.data || new Date().toISOString().split('T')[0]}
            onChange={(e) => setEditingMovement({ ...editingMovement, data: e.target.value })}
          />
          <Input
            label={`Valor (R$) ${editingMovement.tipo === 'uso_emergencial' ? '- Saída' : ''}`}
            type="number"
            step="0.01"
            value={Math.abs(editingMovement.valor || 0)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setEditingMovement({ 
                ...editingMovement, 
                valor: editingMovement.tipo === 'uso_emergencial' ? -Math.abs(val) : Math.abs(val)
              });
            }}
            required
          />
          {editingMovement.tipo === 'aporte' && (
            <Select
              label="Sócio"
              options={[
                { value: '', label: 'Selecione o sócio' },
                ...memberships.filter(m => m.status === 'ativo').map(m => {
                  const u = users.find(u => u.id === m.userId);
                  return { value: m.userId, label: u?.nome || 'Desconhecido' };
                })
              ]}
              value={editingMovement.socioId || ''}
              onChange={(e) => setEditingMovement({ ...editingMovement, socioId: e.target.value })}
            />
          )}
        </div>
        {editingMovement.tipo === 'uso_emergencial' && (
          <div style={{ marginTop: '1rem' }}>
            <Input
              label="Justificativa (OBRIGATÓRIA)"
              value={editingMovement.justificativa || ''}
              onChange={(e) => setEditingMovement({ ...editingMovement, justificativa: e.target.value })}
              placeholder="Descreva o motivo do uso emergencial..."
              required
            />
            <div className="warning-box">
              <AlertTriangle size={16} />
              <span>Este uso será registrado na trilha de auditoria com data, valor e justificativa.</span>
            </div>
          </div>
        )}
        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Observações"
            value={editingMovement.observacoes || ''}
            onChange={(e) => setEditingMovement({ ...editingMovement, observacoes: e.target.value })}
            placeholder="Observações adicionais..."
          />
        </div>
      </Modal>

      {/* Modal de Ativo */}
      <Modal
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        title={editingAsset.id ? 'Editar Ativo' : 'Novo Ativo Patrimonial'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssetModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAsset}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Nome do Ativo"
            value={editingAsset.nome || ''}
            onChange={(e) => setEditingAsset({ ...editingAsset, nome: e.target.value })}
            placeholder="Ex: Hangar Próprio – Base XYZ"
            required
          />
          <Select
            label="Tipo"
            options={assetTypes}
            value={editingAsset.tipo || 'imobilizado'}
            onChange={(e) => setEditingAsset({ ...editingAsset, tipo: e.target.value as any })}
          />
          <Select
            label="Status"
            options={assetStatuses}
            value={editingAsset.status || 'em_construcao'}
            onChange={(e) => setEditingAsset({ ...editingAsset, status: e.target.value as any })}
          />
          <Input
            label="Localização"
            value={editingAsset.localizacao || ''}
            onChange={(e) => setEditingAsset({ ...editingAsset, localizacao: e.target.value })}
            placeholder="Ex: SBJD - Jundiaí"
          />
          <Input
            label="Data de Início"
            type="date"
            value={editingAsset.dataInicioObra || ''}
            onChange={(e) => setEditingAsset({ ...editingAsset, dataInicioObra: e.target.value })}
          />
          <Input
            label="Valor Estimado Total (Orçamento)"
            type="number"
            step="0.01"
            value={editingAsset.valorEstimadoTotal || ''}
            onChange={(e) => setEditingAsset({ ...editingAsset, valorEstimadoTotal: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Vida Útil (anos)"
            type="number"
            value={editingAsset.vidaUtilAnos || ''}
            onChange={(e) => setEditingAsset({ ...editingAsset, vidaUtilAnos: parseInt(e.target.value) })}
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Descrição"
            value={editingAsset.descricao || ''}
            onChange={(e) => setEditingAsset({ ...editingAsset, descricao: e.target.value })}
            placeholder="Descrição do ativo..."
          />
        </div>
        <div className="info-box">
          <FileText size={16} />
          <span>Os investimentos (CAPEX) serão automaticamente rateados entre os sócios conforme suas cotas de participação.</span>
        </div>
      </Modal>

      {/* Modal de Investimento */}
      <Modal
        isOpen={investmentModalOpen}
        onClose={() => setInvestmentModalOpen(false)}
        title="Registrar Investimento (CAPEX)"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInvestmentModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveInvestment}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Data"
            type="date"
            value={editingInvestment.data || new Date().toISOString().split('T')[0]}
            onChange={(e) => setEditingInvestment({ ...editingInvestment, data: e.target.value })}
            required
          />
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            value={editingInvestment.valor || ''}
            onChange={(e) => setEditingInvestment({ ...editingInvestment, valor: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Fornecedor"
            value={editingInvestment.fornecedor || ''}
            onChange={(e) => setEditingInvestment({ ...editingInvestment, fornecedor: e.target.value })}
          />
          <Input
            label="Nota Fiscal"
            value={editingInvestment.notaFiscal || ''}
            onChange={(e) => setEditingInvestment({ ...editingInvestment, notaFiscal: e.target.value })}
          />
          <Input
            label="Categoria"
            value={editingInvestment.categoria || ''}
            onChange={(e) => setEditingInvestment({ ...editingInvestment, categoria: e.target.value })}
            placeholder="Ex: Material, Mão de obra, Projeto..."
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Descrição"
            value={editingInvestment.descricao || ''}
            onChange={(e) => setEditingInvestment({ ...editingInvestment, descricao: e.target.value })}
            placeholder="Descrição do investimento..."
            required
          />
        </div>
        <div className="info-box">
          <Percent size={16} />
          <span>Este valor será automaticamente rateado entre os sócios conforme suas cotas de participação na aeronave.</span>
        </div>
      </Modal>
    </div>
  );
}
