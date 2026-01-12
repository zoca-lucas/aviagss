import { useState } from 'react';
import { Plane, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email);
      if (!success) {
        setError('Email não encontrado. Use admin@aerogestao.com ou piloto@aerogestao.com');
      }
    } catch {
      setError('Erro ao fazer login. Tente novamente.');
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
            <p>Sistema de Gestão de Aeronaves Compartilhadas</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <Input
              type="email"
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail />}
              required
            />

            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="login-button">
              Entrar
            </Button>
          </form>

          <div className="login-demo">
            <p>Contas de demonstração:</p>
            <div className="demo-accounts">
              <button type="button" onClick={() => setEmail('admin@aerogestao.com')}>
                admin@aerogestao.com
              </button>
              <button type="button" onClick={() => setEmail('piloto@aerogestao.com')}>
                piloto@aerogestao.com
              </button>
            </div>
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
