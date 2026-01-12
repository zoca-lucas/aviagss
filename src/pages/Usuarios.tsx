import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users as UsersIcon, Shield, UserCheck } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Table from '../components/Table';
import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { User, UserLicense } from '../types';
import { formatDate, formatHours, getUserRoleLabel, getDaysUntil } from '../utils/format';
import './Usuarios.css';

const roles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'piloto', label: 'Piloto' },
  { value: 'cotista', label: 'Cotista' },
];

export default function Usuarios() {
  const { user: currentUser, permissions } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [editingLicense, setEditingLicense] = useState<Partial<UserLicense>>({});
  const [selectedUserLicenses, setSelectedUserLicenses] = useState<{ user: User; licenses: UserLicense[] } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(storage.getUsers());
  };

  const handleSaveUser = () => {
    if (!currentUser || !editingUser.nome || !editingUser.email) return;

    const userToSave = {
      ...editingUser,
      active: editingUser.active !== false,
      horasTotais: editingUser.horasTotais || 0,
    } as User;

    storage.saveUser(userToSave, currentUser.id, currentUser.nome);
    loadUsers();
    setModalOpen(false);
    setEditingUser({});
  };

  const handleSaveLicense = () => {
    if (!selectedUserLicenses || !editingLicense.tipo) return;

    const license = {
      ...editingLicense,
      userId: selectedUserLicenses.user.id,
    } as UserLicense;

    storage.saveUserLicense(license);
    setSelectedUserLicenses({
      ...selectedUserLicenses,
      licenses: storage.getUserLicenses(selectedUserLicenses.user.id),
    });
    setLicenseModalOpen(false);
    setEditingLicense({});
  };

  const handleDeleteLicense = (id: string) => {
    if (!selectedUserLicenses) return;
    if (confirm('Tem certeza que deseja excluir esta licença?')) {
      storage.deleteUserLicense(id);
      setSelectedUserLicenses({
        ...selectedUserLicenses,
        licenses: storage.getUserLicenses(selectedUserLicenses.user.id),
      });
    }
  };

  const openLicenses = (user: User) => {
    setSelectedUserLicenses({
      user,
      licenses: storage.getUserLicenses(user.id),
    });
  };

  if (!permissions.canManageUsers) {
    return (
      <div className="empty-state">
        <Shield size={64} className="empty-state-icon" />
        <h3>Acesso Restrito</h3>
        <p>Você não tem permissão para gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="usuarios-page">
      <div className="page-header">
        <div>
          <h1>Usuários</h1>
          <p className="page-subtitle">Gerenciamento de usuários e licenças</p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => {
            setEditingUser({ role: 'piloto', active: true });
            setModalOpen(true);
          }}
        >
          Novo Usuário
        </Button>
      </div>

      {/* Resumo */}
      <div className="users-summary">
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon"><UsersIcon size={24} /></div>
            <div className="summary-info">
              <span className="summary-value">{users.length}</span>
              <span className="summary-label">Total</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon admin"><Shield size={24} /></div>
            <div className="summary-info">
              <span className="summary-value">{users.filter(u => u.role === 'admin').length}</span>
              <span className="summary-label">Admins</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon pilot"><UsersIcon size={24} /></div>
            <div className="summary-info">
              <span className="summary-value">{users.filter(u => u.role === 'piloto').length}</span>
              <span className="summary-label">Pilotos</span>
            </div>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-content">
            <div className="summary-icon active"><UserCheck size={24} /></div>
            <div className="summary-info">
              <span className="summary-value">{users.filter(u => u.active).length}</span>
              <span className="summary-label">Ativos</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Usuários */}
      <Card>
        <Table
          columns={[
            {
              key: 'nome',
              header: 'Usuário',
              render: (u) => (
                <div className="user-cell">
                  <div className="user-avatar">{u.nome.charAt(0).toUpperCase()}</div>
                  <div className="user-info">
                    <span className="user-name">{u.nome}</span>
                    <span className="user-email">{u.email}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Perfil',
              render: (u) => <Badge variant={u.role === 'admin' ? 'info' : 'default'}>{getUserRoleLabel(u.role)}</Badge>,
            },
            { key: 'telefone', header: 'Telefone', render: (u) => u.telefone || '-' },
            { key: 'horasTotais', header: 'Horas', render: (u) => formatHours(u.horasTotais) },
            {
              key: 'status',
              header: 'Status',
              render: (u) => <Badge variant={u.active ? 'success' : 'default'}>{u.active ? 'Ativo' : 'Inativo'}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              width: '120px',
              render: (u) => (
                <div className="table-actions">
                  <Button size="sm" variant="ghost" onClick={() => openLicenses(u)}>
                    Licenças
                  </Button>
                  <button className="action-btn" onClick={() => { setEditingUser(u); setModalOpen(true); }}>
                    <Edit size={14} />
                  </button>
                </div>
              ),
            },
          ]}
          data={users}
          keyExtractor={(u) => u.id}
          emptyMessage="Nenhum usuário cadastrado"
        />
      </Card>

      {/* Modal de Usuário */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Nome"
            value={editingUser.nome || ''}
            onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={editingUser.email || ''}
            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
            required
          />
          <Input
            label="Telefone"
            value={editingUser.telefone || ''}
            onChange={(e) => setEditingUser({ ...editingUser, telefone: e.target.value })}
          />
          <Select
            label="Perfil"
            options={roles}
            value={editingUser.role || 'piloto'}
            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
          />
          <Input
            label="Horas Totais"
            type="number"
            value={editingUser.horasTotais || 0}
            onChange={(e) => setEditingUser({ ...editingUser, horasTotais: parseFloat(e.target.value) })}
          />
          <div className="checkbox-wrapper">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editingUser.active !== false}
                onChange={(e) => setEditingUser({ ...editingUser, active: e.target.checked })}
              />
              Usuário ativo
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal de Licenças */}
      <Modal
        isOpen={!!selectedUserLicenses}
        onClose={() => setSelectedUserLicenses(null)}
        title={`Licenças - ${selectedUserLicenses?.user.nome}`}
        size="lg"
      >
        <div className="licenses-section">
          <div className="licenses-header">
            <h4>Licenças e Habilitações</h4>
            <Button
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingLicense({});
                setLicenseModalOpen(true);
              }}
            >
              Adicionar
            </Button>
          </div>

          <div className="licenses-list">
            {selectedUserLicenses?.licenses.map((license) => {
              const diasRestantes = license.validade ? getDaysUntil(license.validade) : null;
              const isExpired = diasRestantes !== null && diasRestantes <= 0;
              const isNearExpiry = diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 30;

              return (
                <div key={license.id} className={`license-item ${isExpired ? 'expired' : isNearExpiry ? 'near-expiry' : ''}`}>
                  <div className="license-info">
                    <span className="license-type">{license.tipo}</span>
                    {license.numero && <span className="license-number">Nº {license.numero}</span>}
                    {license.validade && (
                      <span className="license-validity">Validade: {formatDate(license.validade)}</span>
                    )}
                  </div>
                  <div className="license-actions">
                    {diasRestantes !== null && (
                      <Badge variant={isExpired ? 'danger' : isNearExpiry ? 'warning' : 'success'}>
                        {isExpired ? 'Vencida' : `${diasRestantes}d`}
                      </Badge>
                    )}
                    <button className="action-btn danger" onClick={() => handleDeleteLicense(license.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {selectedUserLicenses?.licenses.length === 0 && (
              <div className="empty-licenses">
                <p>Nenhuma licença cadastrada</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Nova Licença */}
      <Modal
        isOpen={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        title="Nova Licença"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLicenseModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveLicense}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Input
            label="Tipo"
            value={editingLicense.tipo || ''}
            onChange={(e) => setEditingLicense({ ...editingLicense, tipo: e.target.value.toUpperCase() })}
            placeholder="CMA, PP, PC, IFRA, MLTE..."
            required
          />
          <Input
            label="Número"
            value={editingLicense.numero || ''}
            onChange={(e) => setEditingLicense({ ...editingLicense, numero: e.target.value })}
          />
          <Input
            label="Validade"
            type="date"
            value={editingLicense.validade || ''}
            onChange={(e) => setEditingLicense({ ...editingLicense, validade: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
