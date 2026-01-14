import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plane, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import './Login.css';

export default function Cadastro() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [telefone, setTelefone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!email.trim()) {
      setError('Email é obrigatório');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const result = await register(email, password, nome, telefone || undefined);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Erro ao fazer cadastro. Tente novamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="gradient-1" />
        <div className="gradient-2" />
        <div className="grid-overlay" />
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Plane className="logo-icon" />
            </div>
            <h1>AeroGestão</h1>
            <p>Criar nova conta</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <Input
              type="text"
              label="Nome completo"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              icon={<User />}
              required
              autoComplete="name"
            />

            <Input
              type="email"
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail />}
              required
              autoComplete="email"
            />

            <Input
              type="tel"
              label="Telefone (opcional)"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              icon={<Phone />}
              autoComplete="tel"
            />

            <Input
              type="password"
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock />}
              required
              autoComplete="new-password"
            />

            <Input
              type="password"
              label="Confirmar senha"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock />}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="login-button">
              Criar conta
            </Button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Já tem uma conta?{' '}
              <Link
                to="/login"
                style={{
                  color: 'var(--accent-color)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>

        <div className="login-features">
          <div className="feature">
            <div className="feature-icon">📊</div>
            <h3>Dashboard Completo</h3>
            <p>Visualize todas as informações da sua aeronave em um só lugar</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📒</div>
            <h3>Logbook Digital</h3>
            <p>Registre voos com rastreabilidade total</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔧</div>
            <h3>Controle de Manutenção</h3>
            <p>Alertas automáticos de vencimento por horas e calendário</p>
          </div>
          <div className="feature">
            <div className="feature-icon">💰</div>
            <h3>Rateio Financeiro</h3>
            <p>Distribuição automática de custos entre cotistas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
