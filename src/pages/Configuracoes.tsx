import { useState, useEffect } from 'react';
import { Settings, Bell, Clock, Shield, Database, Save, Wrench, Fuel, PiggyBank } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { SystemConfig, AuditLog } from '../types';
import { formatDateTime, formatCurrency } from '../utils/format';
import './Configuracoes.css';

export default function Configuracoes() {
  const { permissions } = useAuth();
  const [config, setConfig] = useState<SystemConfig>(storage.getConfig());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAuditLogs(storage.getAuditLogs().slice(0, 50));
  }, []);

  const handleSave = () => {
    storage.saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="configuracoes-page">
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p className="page-subtitle">Preferências do sistema</p>
        </div>
        <Button icon={<Save size={18} />} onClick={handleSave}>
          {saved ? 'Salvo!' : 'Salvar Alterações'}
        </Button>
      </div>

      <div className="config-grid">
        {/* Alertas */}
        <Card title="Alertas e Notificações" className="config-card">
          <div className="config-section">
            <div className="config-item">
              <div className="config-info">
                <Bell size={20} />
                <div>
                  <span className="config-label">Alerta de Manutenção (dias)</span>
                  <span className="config-hint">Dias antes do vencimento para alertar</span>
                </div>
              </div>
              <Input
                type="number"
                value={config.alertaManutencaoDias}
                onChange={(e) => setConfig({ ...config, alertaManutencaoDias: parseInt(e.target.value) })}
                className="config-input"
              />
            </div>

            <div className="config-item">
              <div className="config-info">
                <Clock size={20} />
                <div>
                  <span className="config-label">Alerta de Manutenção (horas)</span>
                  <span className="config-hint">Horas antes do vencimento para alertar</span>
                </div>
              </div>
              <Input
                type="number"
                value={config.alertaManutencaoHoras}
                onChange={(e) => setConfig({ ...config, alertaManutencaoHoras: parseInt(e.target.value) })}
                className="config-input"
              />
            </div>

            <div className="config-item">
              <div className="config-info">
                <Bell size={20} />
                <div>
                  <span className="config-label">Alerta de Documento (dias)</span>
                  <span className="config-hint">Dias antes do vencimento para alertar</span>
                </div>
              </div>
              <Input
                type="number"
                value={config.alertaDocumentoDias}
                onChange={(e) => setConfig({ ...config, alertaDocumentoDias: parseInt(e.target.value) })}
                className="config-input"
              />
            </div>

            <div className="config-item">
              <div className="config-info">
                <Bell size={20} />
                <div>
                  <span className="config-label">Alerta de Pagamento (dias)</span>
                  <span className="config-hint">Dias antes do vencimento para alertar</span>
                </div>
              </div>
              <Input
                type="number"
                value={config.alertaPagamentoDias}
                onChange={(e) => setConfig({ ...config, alertaPagamentoDias: parseInt(e.target.value) })}
                className="config-input"
              />
            </div>
          </div>
        </Card>

        {/* Combustível */}
        <Card title="Parâmetros de Voo" className="config-card">
          <div className="config-section">
            <div className="config-item">
              <div className="config-info">
                <Clock size={20} />
                <div>
                  <span className="config-label">Reserva de Combustível (min)</span>
                  <span className="config-hint">Minutos de reserva padrão</span>
                </div>
              </div>
              <Input
                type="number"
                value={config.reservaCombustivelMinutos}
                onChange={(e) => setConfig({ ...config, reservaCombustivelMinutos: parseInt(e.target.value) })}
                className="config-input"
              />
            </div>

            <div className="config-item">
              <div className="config-info">
                <Shield size={20} />
                <div>
                  <span className="config-label">Margem de Segurança (%)</span>
                  <span className="config-hint">Percentual adicional de combustível</span>
                </div>
              </div>
              <Input
                type="number"
                value={config.margemSegurancaPercentual}
                onChange={(e) => setConfig({ ...config, margemSegurancaPercentual: parseInt(e.target.value) })}
                className="config-input"
              />
            </div>

            <div className="config-item">
              <div className="config-info">
                <Fuel size={20} />
                <div>
                  <span className="config-label">Fator Conversão lbs → litros</span>
                  <span className="config-hint">Para AVGAS: ~0.567 (545 lbs = 309 L)</span>
                </div>
              </div>
              <Input
                type="number"
                step="0.01"
                value={config.fatorConversaoLbsLitros || 0.567}
                onChange={(e) => setConfig({ ...config, fatorConversaoLbsLitros: parseFloat(e.target.value) })}
                className="config-input"
              />
            </div>
          </div>
        </Card>

        {/* Provisão TBO */}
        <Card title="Provisão TBO" className="config-card tbo-card">
          <div className="config-section">
            <div className="tbo-info-box">
              <Wrench size={24} />
              <div>
                <h4>Configuração da Provisão de TBO</h4>
                <p>
                  A provisão TBO é calculada automaticamente com base no tempo de voo registrado.
                  O valor é provisionado por hora voada para cobrir custos futuros de revisão geral (TBO).
                </p>
              </div>
            </div>

            <div className="config-item highlight">
              <div className="config-info">
                <Wrench size={20} />
                <div>
                  <span className="config-label">Valor da Provisão TBO (R$/hora)</span>
                  <span className="config-hint">Padrão: R$ 2.800,00 por hora voada</span>
                </div>
              </div>
              <Input
                type="number"
                step="100"
                value={config.tboValorPorHora || 2800}
                onChange={(e) => setConfig({ ...config, tboValorPorHora: parseFloat(e.target.value) })}
                className="config-input tbo-input"
              />
            </div>

            <div className="tbo-example">
              <span className="example-label">Exemplo de cálculo:</span>
              <div className="example-calc">
                <span>1 hora de voo × {formatCurrency(config.tboValorPorHora || 2800)} = </span>
                <strong>{formatCurrency(config.tboValorPorHora || 2800)}</strong>
                <span> de provisão</span>
              </div>
            </div>

            <div className="tbo-rules">
              <h5>Regras aplicadas:</h5>
              <ul>
                <li>A provisão é calculada automaticamente ao registrar um lançamento de voo</li>
                <li>O valor é dividido entre os grupos conforme o tipo de voo (Grossi / Shimada / Ambos)</li>
                <li>A provisão é incluída no custo total do voo e no rateio entre membros</li>
                <li>Um saldo acumulado de provisão TBO é mantido por aeronave</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Reserva de Margem */}
        <Card title="Reserva de Margem (Liquidez)" className="config-card tbo-card">
          <div className="config-section">
            <div className="tbo-info-box">
              <PiggyBank size={24} />
              <div>
                <h4>Configuração da Reserva de Margem</h4>
                <p>
                  A reserva de margem garante liquidez mínima para cobrir chamadas de margem e eventos extraordinários.
                  Este valor deve estar sempre disponível em conta separada, não sendo considerado caixa livre.
                </p>
              </div>
            </div>

            <div className="config-item highlight">
              <div className="config-info">
                <PiggyBank size={20} />
                <div>
                  <span className="config-label">Valor Mínimo da Reserva (R$)</span>
                  <span className="config-hint">Padrão: R$ 200.000,00</span>
                </div>
              </div>
              <Input
                type="number"
                step="10000"
                value={config.reservaMargemMinima || 200000}
                onChange={(e) => setConfig({ ...config, reservaMargemMinima: parseFloat(e.target.value) })}
                className="config-input tbo-input"
              />
            </div>

            <div className="config-item">
              <div className="config-info">
                <Bell size={20} />
                <div>
                  <span className="config-label">Alertar quando abaixo de (%)</span>
                  <span className="config-hint">Percentual do mínimo para gerar alerta (ex: 110% = alerta se &lt; 110%)</span>
                </div>
              </div>
              <Input
                type="number"
                value={config.alertaReservaPercentual || 110}
                onChange={(e) => setConfig({ ...config, alertaReservaPercentual: parseInt(e.target.value) })}
                className="config-input"
              />
            </div>

            <div className="tbo-rules">
              <h5>Regras da Reserva:</h5>
              <ul>
                <li>A reserva <strong>não entra no cálculo de caixa operacional</strong></li>
                <li>Não pode ser usada para despesas comuns do dia a dia</li>
                <li>Somente administradores podem movimentar esta reserva</li>
                <li>Uso emergencial requer justificativa obrigatória e auditoria</li>
                <li>Se abaixo do mínimo, status financeiro será marcado como "Risco de Liquidez"</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Trilha de Auditoria */}
        {permissions.canManageUsers && (
          <Card title="Trilha de Auditoria" className="config-card full-width">
            <div className="audit-section">
              <div className="audit-info">
                <Database size={20} />
                <span>Últimas {auditLogs.length} alterações registradas</span>
              </div>

              <div className="audit-list">
                {auditLogs.map((log) => (
                  <div key={log.id} className="audit-item">
                    <div className="audit-action">
                      <span className={`action-badge ${log.action}`}>
                        {log.action === 'create' ? 'Criou' : log.action === 'update' ? 'Alterou' : 'Excluiu'}
                      </span>
                      <span className="audit-entity">{log.entity}</span>
                    </div>
                    <div className="audit-details">
                      <span className="audit-user">{log.userName}</span>
                      <span className="audit-time">{formatDateTime(log.timestamp)}</span>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="empty-audit">
                    <p>Nenhuma alteração registrada</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Sobre */}
        <Card title="Sobre o Sistema" className="config-card">
          <div className="about-section">
            <div className="about-logo">
              <Settings size={48} />
            </div>
            <h3>AeroGestão</h3>
            <p>Sistema de Gestão de Aeronaves Compartilhadas</p>
            <div className="about-details">
              <span>Versão 1.0.0</span>
              <span>•</span>
              <span>Desenvolvido com React + TypeScript</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
