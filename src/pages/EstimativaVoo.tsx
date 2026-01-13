import { useState, useEffect } from 'react';
import { 
  Navigation, Plane, Clock, Fuel, Save, ArrowRight, 
  Loader2, AlertTriangle, CheckCircle2, Sparkles, Users
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Badge from '../components/Badge';
import AirportAutocomplete from '../components/AirportAutocomplete';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { aiFlightEstimateService } from '../services/aiFlightEstimate';
import { EnhancedFlightEstimate, ConfidenceLevel, AirportRecord } from '../types';
import { formatCurrency, formatHours, formatDistance, formatFuel } from '../utils/format';
import './EstimativaVoo.css';

export default function EstimativaVoo() {
  const { user } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [estimate, setEstimate] = useState<Partial<EnhancedFlightEstimate>>({});
  const [calculated, setCalculated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedEstimates, setSavedEstimates] = useState<EnhancedFlightEstimate[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  
  // Estados simplificados - campos principais + combustível
  const [originAirport, setOriginAirport] = useState<AirportRecord | null>(null);
  const [destAirport, setDestAirport] = useState<AirportRecord | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [initialFuel, setInitialFuel] = useState<number | undefined>(undefined);
  const [fuelPrice, setFuelPrice] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (selectedAircraft) {
      setSavedEstimates(storage.getFlightEstimates(selectedAircraft.id) as EnhancedFlightEstimate[]);
    }
  }, [selectedAircraft]);

  const handleCalculate = async () => {
    if (!selectedAircraft || !originAirport || !destAirport || !passengers) {
      alert('Selecione os aeroportos de origem e destino');
      return;
    }

    setLoading(true);
    setCalculated(false);

    try {
      const enhanced = await aiFlightEstimateService.estimateFlight({
        originICAO: originAirport.ident,
        destICAO: destAirport.ident,
        passengers,
        initialFuel,
        fuelPrice,
        aircraftId: selectedAircraft.id,
        manufacturer: selectedAircraft.fabricante,
        model: selectedAircraft.modelo,
        variant: undefined,
        year: selectedAircraft.anoFabricacao,
      });

      enhanced.criadoPor = user?.id || '';
      setEstimate(enhanced);
      setCalculated(true);
    } catch (error: any) {
      alert(`Erro ao calcular: ${error.message}`);
      console.error('Erro ao calcular estimativa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!user || !selectedAircraft || !calculated || !estimate.id) return;

    const flightEstimate: EnhancedFlightEstimate = estimate as EnhancedFlightEstimate;
    storage.saveFlightEstimate(flightEstimate as any, user.id, user.nome);
    setSavedEstimates(storage.getFlightEstimates(selectedAircraft.id) as EnhancedFlightEstimate[]);
    alert('Estimativa salva com sucesso!');
  };

  const handleConvertToFlight = () => {
    if (!user || !estimate.id) return;
    const flight = storage.convertEstimateToFlight(estimate.id, user.id, user.nome);
    if (flight) {
      alert('Voo criado com sucesso! Você pode editá-lo no Logbook.');
    }
  };

  const getConfidenceBadge = (confidence: ConfidenceLevel) => {
    const config = {
      alta: { variant: 'success' as const, icon: CheckCircle2, label: 'Alta Confiança' },
      media: { variant: 'warning' as const, icon: AlertTriangle, label: 'Média Confiança' },
      baixa: { variant: 'danger' as const, icon: AlertTriangle, label: 'Baixa Confiança' },
    };

    const { variant, icon: Icon, label } = config[confidence];
    return (
      <Badge variant={variant} size="sm">
        <Icon size={12} style={{ marginRight: 4 }} />
        {label}
      </Badge>
    );
  };

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <Navigation size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para fazer estimativas de voo.</p>
      </div>
    );
  }

  return (
    <div className="estimativa-page">
      <div className="page-header">
        <div>
          <h1>Estimativa de Voo com IA</h1>
          <p className="page-subtitle">
            Planejamento inteligente - {selectedAircraft.prefixo}
            <Sparkles size={16} style={{ marginLeft: 8, color: 'var(--accent-color)' }} />
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setHistoryModalOpen(true)}
        >
          Histórico
        </Button>
      </div>

      <div className="estimativa-grid">
        {/* Painel de Entrada Simplificado */}
        <Card title="Dados do Voo" className="input-card">
          <div className="ai-badge">
            <Sparkles size={16} />
            <span>IA detecta automaticamente aeroportos e calcula tudo</span>
          </div>

          <div className="aircraft-info">
            <div className="info-item">
              <Plane size={18} />
              <span>{selectedAircraft.modelo}</span>
            </div>
            <div className="info-item">
              <Clock size={18} />
              <span>{selectedAircraft.velocidadeCruzeiro} kt</span>
            </div>
            <div className="info-item">
              <Fuel size={18} />
              <span>{selectedAircraft.consumoMedio} L/h</span>
            </div>
          </div>

          <div className="simple-inputs">
            <AirportAutocomplete
              label="Aeroporto de Origem"
              value={originAirport?.ident}
              onChange={setOriginAirport}
              placeholder="Digite a cidade ou código ICAO (ex: SBSP, SBGR)..."
              hint="Selecione o aeroporto de origem pelo nome ou código ICAO"
              required
            />

            <div className="route-arrow-simple">
              <ArrowRight size={24} />
            </div>

            <AirportAutocomplete
              label="Aeroporto de Destino"
              value={destAirport?.ident}
              onChange={setDestAirport}
              placeholder="Digite a cidade ou código ICAO (ex: SBGL, SBRJ)..."
              hint="Selecione o aeroporto de destino pelo nome ou código ICAO"
              required
            />

            <Input
              label="Número de Passageiros"
              type="number"
              min="1"
              max="20"
              value={passengers.toString()}
              onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value) || 1))}
              icon={<Users size={16} />}
              hint="Incluindo você (piloto)"
            />

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9375rem', margin: '0 0 1rem', color: 'var(--text-secondary)' }}>
                Combustível (Opcional)
              </h4>
              
              <Input
                label="Combustível Inicial (litros)"
                type="number"
                min="0"
                step="0.1"
                value={initialFuel?.toString() || ''}
                onChange={(e) => setInitialFuel(e.target.value ? parseFloat(e.target.value) : undefined)}
                icon={<Fuel size={16} />}
                hint="Quantidade de combustível já no tanque"
                placeholder="Deixe vazio para calcular automaticamente"
              />

              <Input
                label="Preço do Combustível (R$/L)"
                type="number"
                min="0"
                step="0.01"
                value={fuelPrice?.toString() || ''}
                onChange={(e) => setFuelPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                icon={<Fuel size={16} />}
                hint="Preço por litro no aeroporto de origem"
                placeholder="Deixe vazio para usar preço padrão"
              />
            </div>
          </div>

          <div className="ai-info-box">
            <h4>🤖 O que a IA faz automaticamente:</h4>
            <ul>
              <li>✓ Calcula distância entre os aeroportos selecionados</li>
              <li>✓ Estima altitude de cruzeiro ideal</li>
              <li>✓ Escolhe perfil de voo (econômico/normal/rápido)</li>
              <li>✓ Calcula vento e condições meteorológicas</li>
              <li>✓ Estima bagagem e combustível necessário</li>
              <li>✓ Calcula todos os custos e tempos</li>
            </ul>
            <p style={{ 
              marginTop: '1rem', 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}>
              💡 <strong>Dica:</strong> Informar combustível inicial e preço melhora a precisão dos cálculos!
            </p>
          </div>

          <Button 
            className="calculate-btn" 
            onClick={handleCalculate}
            disabled={loading || !originAirport || !destAirport || !passengers || passengers < 1}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinning" />
                Calculando com IA...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Calcular com IA
              </>
            )}
          </Button>
        </Card>

        {/* Painel de Resultados */}
        <Card title="Resultados" className="results-card">
          {calculated && estimate.id ? (
            <>
              {estimate.confidence && (
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {getConfidenceBadge(estimate.confidence)}
                  {estimate.confidenceReasons && estimate.confidenceReasons.length > 0 && (
                    <details style={{ fontSize: '0.875rem', color: '#666' }}>
                      <summary style={{ cursor: 'pointer' }}>Detalhes da IA</summary>
                      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        {estimate.confidenceReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <div className="result-section">
                <h4>Rota</h4>
                <div className="route-summary">
                  <span className="route-origin">{estimate.origemIcao}</span>
                  <div className="route-line">
                    <span className="route-distance">{formatDistance(estimate.distanciaTotal || 0)}</span>
                  </div>
                  <span className="route-dest">{estimate.destinoIcao}</span>
                </div>
                <p className="route-names">
                  {estimate.origem} → {estimate.destino}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  ✈️ Aeroportos selecionados automaticamente pela IA
                </p>
              </div>

              {estimate.phases && (
                <div className="phases-breakdown">
                  <h4>Breakdown por Fase</h4>
                  <div className="phases-grid">
                    <div className="phase-item">
                      <span className="phase-label">Táxi</span>
                      <span className="phase-time">{estimate.phases.taxi.time} min</span>
                      <span className="phase-fuel">{formatFuel(estimate.phases.taxi.fuel)}</span>
                    </div>
                    <div className="phase-item">
                      <span className="phase-label">Subida</span>
                      <span className="phase-time">{estimate.phases.climb.time.toFixed(0)} min</span>
                      <span className="phase-fuel">{formatFuel(estimate.phases.climb.fuel)}</span>
                      <span className="phase-alt">até {estimate.phases.climb.altitude.toLocaleString()} ft</span>
                    </div>
                    <div className="phase-item">
                      <span className="phase-label">Cruzeiro</span>
                      <span className="phase-time">{formatHours(estimate.phases.cruise.time / 60)}</span>
                      <span className="phase-fuel">{formatFuel(estimate.phases.cruise.fuel)}</span>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>
                        TAS: {estimate.phases.cruise.tas} kt | 
                        GS: {estimate.phases.cruise.gs.toFixed(0)} kt
                        {estimate.phases.cruise.windComponent !== 0 && (
                          <span style={{ color: estimate.phases.cruise.windComponent > 0 ? 'red' : 'green' }}>
                            {' '}(Vento: {estimate.phases.cruise.windComponent > 0 ? '+' : ''}{estimate.phases.cruise.windComponent.toFixed(0)} kt)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="phase-item">
                      <span className="phase-label">Descida</span>
                      <span className="phase-time">{estimate.phases.descent.time.toFixed(0)} min</span>
                      <span className="phase-fuel">{formatFuel(estimate.phases.descent.fuel)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="results-grid">
                <div className="result-item">
                  <div className="result-icon blue">
                    <Clock size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-value">{formatHours(estimate.tempoVooEstimado || 0)}</span>
                    <span className="result-label">Tempo de Voo</span>
                  </div>
                </div>

                <div className="result-item">
                  <div className="result-icon green">
                    <Clock size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-value">{formatHours(estimate.tempoTotal || 0)}</span>
                    <span className="result-label">Tempo Total (Block)</span>
                  </div>
                </div>

                <div className="result-item">
                  <div className="result-icon orange">
                    <Fuel size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-value">{formatFuel(estimate.combustivelNecessario || 0)}</span>
                    <span className="result-label">Combustível</span>
                  </div>
                </div>

                <div className="result-item">
                  <div className="result-icon red">
                    <Fuel size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-value">{formatFuel(estimate.combustivelComReserva || 0)}</span>
                    <span className="result-label">Com Reserva</span>
                  </div>
                </div>
              </div>

              {estimate.uncertainty && (
                <div className="uncertainty-section">
                  <h4>Intervalos de Incerteza</h4>
                  <div className="uncertainty-grid">
                    <div>
                      <span>Tempo:</span>
                      <span>{formatHours(estimate.uncertainty.timeMin)} - {formatHours(estimate.uncertainty.timeMax)}</span>
                    </div>
                    <div>
                      <span>Combustível:</span>
                      <span>{formatFuel(estimate.uncertainty.fuelMin)} - {formatFuel(estimate.uncertainty.fuelMax)}</span>
                    </div>
                    <div>
                      <span>Custo:</span>
                      <span>{formatCurrency(estimate.uncertainty.costMin)} - {formatCurrency(estimate.uncertainty.costMax)}</span>
                    </div>
                  </div>
                </div>
              )}

              {estimate.costBreakdown && (
                <div className="costs-section">
                  <h4>Custos Estimados</h4>
                  <div className="costs-breakdown">
                    <div className="cost-row">
                      <span>Combustível</span>
                      <span>{formatCurrency(estimate.costBreakdown.fuel)}</span>
                    </div>
                    <div className="cost-row">
                      <span>Taxas de Pouso</span>
                      <span>{formatCurrency(estimate.costBreakdown.landingFee)}</span>
                    </div>
                    <div className="cost-row">
                      <span>Estacionamento</span>
                      <span>{formatCurrency(estimate.costBreakdown.parkingFee)}</span>
                    </div>
                    <div className="cost-row">
                      <span>Operacional (R$ 2.800/h)</span>
                      <span>{formatCurrency(estimate.costBreakdown.operational)}</span>
                    </div>
                    <div className="cost-row total">
                      <span>Total</span>
                      <span>{formatCurrency(estimate.costBreakdown.total)}</span>
                    </div>
                    <div className="cost-row per-hour">
                      <span>Custo por Hora</span>
                      <span>{formatCurrency(estimate.costPerHour || 0)}</span>
                    </div>
                    {estimate.costPerNM && (
                      <div className="cost-row">
                        <span>Custo por Milha Náutica</span>
                        <span>{formatCurrency(estimate.costPerNM)}</span>
                      </div>
                    )}
                    {estimate.efficiency && (
                      <div className="cost-row">
                        <span>Eficiência</span>
                        <span>{estimate.efficiency.toFixed(1)} NM/gal</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="actions">
                <Button variant="secondary" icon={<Save size={18} />} onClick={handleSave}>
                  Salvar Estimativa
                </Button>
                <Button icon={<Plane size={18} />} onClick={handleConvertToFlight}>
                  Converter em Voo
                </Button>
              </div>
            </>
          ) : (
            <div className="empty-results">
              <Sparkles size={48} style={{ color: 'var(--accent-color)' }} />
              <p>Preencha os dados e clique em "Calcular com IA"</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                A IA fará todo o trabalho pesado para você! 🚀
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Modal de Histórico */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Histórico de Estimativas"
        size="lg"
      >
        <div className="history-list">
          {savedEstimates.map((est) => (
            <div key={est.id} className="history-item">
              <div className="history-route">
                <span>{est.origemIcao}</span>
                <ArrowRight size={16} />
                <span>{est.destinoIcao}</span>
              </div>
              <div className="history-details">
                <span>{formatDistance(est.distanciaTotal)}</span>
                <span>{formatHours(est.tempoTotal)}</span>
                <span>{formatCurrency(est.custoTotal)}</span>
              </div>
              <div className="history-status">
                {est.convertidoEmVoo ? (
                  <span className="converted">Convertido</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEstimate(est);
                      setCalculated(true);
                      setHistoryModalOpen(false);
                    }}
                  >
                    Usar
                  </Button>
                )}
              </div>
            </div>
          ))}
          {savedEstimates.length === 0 && (
            <div className="empty-history">
              <p>Nenhuma estimativa salva</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}