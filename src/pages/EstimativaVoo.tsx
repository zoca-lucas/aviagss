import { useState, useEffect } from 'react';
import { Navigation, Plane, Clock, Fuel, DollarSign, Save, ArrowRight, Plus, Trash2, MapPin, Wind } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { FlightEstimate, Airport, EstimateLeg } from '../types';
import { formatCurrency, formatHours, formatDistance, formatFuel, calculateDistance } from '../utils/format';
import './EstimativaVoo.css';

export default function EstimativaVoo() {
  const { user } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [estimate, setEstimate] = useState<Partial<FlightEstimate>>({});
  const [legs, setLegs] = useState<EstimateLeg[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [savedEstimates, setSavedEstimates] = useState<FlightEstimate[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  useEffect(() => {
    setAirports(storage.getAirports());
    if (selectedAircraft) {
      setSavedEstimates(storage.getFlightEstimates(selectedAircraft.id));
    }
  }, [selectedAircraft]);

  const handleAddLeg = () => {
    setLegs([...legs, { origem: '', origemIcao: '', destino: '', destinoIcao: '', distancia: 0, tempoEstimado: 0, combustivel: 0 }]);
  };

  const handleRemoveLeg = (index: number) => {
    setLegs(legs.filter((_, i) => i !== index));
  };

  const handleCalculate = () => {
    if (!selectedAircraft || !estimate.origemIcao || !estimate.destinoIcao) return;

    const origemAirport = airports.find(a => a.icao.toUpperCase() === estimate.origemIcao?.toUpperCase());
    const destinoAirport = airports.find(a => a.icao.toUpperCase() === estimate.destinoIcao?.toUpperCase());

    if (!origemAirport || !destinoAirport) {
      alert('Aeroporto de origem ou destino não encontrado na base de dados.');
      return;
    }

    // Calcular distância
    const distanciaTotal = calculateDistance(
      origemAirport.latitude,
      origemAirport.longitude,
      destinoAirport.latitude,
      destinoAirport.longitude
    );

    // Ajustar velocidade pelo vento
    const vento = estimate.ventoHeadwind || 0;
    const velocidadeEfetiva = selectedAircraft.velocidadeCruzeiro - vento;

    // Tempo de voo
    const tempoVooHoras = distanciaTotal / velocidadeEfetiva;
    const tempoTaxiHoras = (estimate.tempoTaxi || 10) / 60;
    const tempoSubidaDescidaHoras = (estimate.tempoSubidaDescida || 15) / 60;
    const tempoTotal = tempoVooHoras + tempoTaxiHoras + tempoSubidaDescidaHoras;

    // Combustível
    const combustivelNecessario = tempoTotal * selectedAircraft.consumoMedio;
    const reservaMinutos = selectedAircraft.reservaCombustivel || 45;
    const reservaLitros = (reservaMinutos / 60) * selectedAircraft.consumoMedio;
    const margemSeguranca = selectedAircraft.margemSeguranca || 10;
    const combustivelComReserva = combustivelNecessario * (1 + margemSeguranca / 100) + reservaLitros;

    // Custos
    const precoCombustivelOrigem = estimate.precoCombustivelOrigem || 8.5; // R$/L padrão
    const custoCombustivel = combustivelComReserva * precoCombustivelOrigem;
    const custoTaxas = (origemAirport.taxaPouso || 0) + (destinoAirport.taxaPouso || 0);
    const custoOperacional = tempoTotal * (selectedAircraft.custoHora || 0);
    const custoTotal = custoCombustivel + custoTaxas + custoOperacional;
    const custoPorHora = tempoTotal > 0 ? custoTotal / tempoTotal : 0;

    setEstimate({
      ...estimate,
      origem: origemAirport.nome,
      destino: destinoAirport.nome,
      distanciaTotal,
      tempoVooEstimado: tempoVooHoras,
      tempoTotal,
      combustivelNecessario,
      combustivelComReserva,
      custoCombustivel,
      custoTaxas,
      custoOperacional,
      custoTotal,
      custoPorHora,
    });

    setCalculated(true);
  };

  const handleSave = () => {
    if (!user || !selectedAircraft || !calculated) return;

    const flightEstimate: FlightEstimate = {
      ...estimate,
      id: '',
      aircraftId: selectedAircraft.id,
      criadoPor: user.id,
      convertidoEmVoo: false,
      createdAt: new Date().toISOString(),
    } as FlightEstimate;

    storage.saveFlightEstimate(flightEstimate, user.id, user.nome);
    setSavedEstimates(storage.getFlightEstimates(selectedAircraft.id));
    alert('Estimativa salva com sucesso!');
  };

  const handleConvertToFlight = () => {
    if (!user || !estimate.id) return;

    const flight = storage.convertEstimateToFlight(estimate.id, user.id, user.nome);
    if (flight) {
      alert('Voo criado com sucesso! Você pode editá-lo no Logbook.');
    }
  };

  const airportOptions = airports.map(a => ({
    value: a.icao,
    label: `${a.icao} - ${a.nome} (${a.cidade})`,
  }));

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
          <h1>Estimativa de Voo</h1>
          <p className="page-subtitle">Planejamento de voo - {selectedAircraft.prefixo}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setHistoryModalOpen(true)}
        >
          Histórico
        </Button>
      </div>

      <div className="estimativa-grid">
        {/* Painel de Entrada */}
        <Card title="Dados do Voo" className="input-card">
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

          <div className="route-inputs">
            <div className="route-point">
              <div className="point-icon origem">
                <MapPin size={18} />
              </div>
              <Select
                label="Origem (ICAO)"
                options={airportOptions}
                value={estimate.origemIcao || ''}
                onChange={(e) => setEstimate({ ...estimate, origemIcao: e.target.value })}
                placeholder="Selecione..."
              />
            </div>

            <div className="route-arrow">
              <ArrowRight size={24} />
            </div>

            <div className="route-point">
              <div className="point-icon destino">
                <MapPin size={18} />
              </div>
              <Select
                label="Destino (ICAO)"
                options={airportOptions}
                value={estimate.destinoIcao || ''}
                onChange={(e) => setEstimate({ ...estimate, destinoIcao: e.target.value })}
                placeholder="Selecione..."
              />
            </div>
          </div>

          <div className="optional-inputs">
            <h4>Parâmetros Opcionais</h4>
            <div className="inputs-grid">
              <Input
                label="Vento de proa (kt)"
                type="number"
                value={estimate.ventoHeadwind || ''}
                onChange={(e) => setEstimate({ ...estimate, ventoHeadwind: parseInt(e.target.value) })}
                hint="Positivo = contra, Negativo = favor"
                icon={<Wind size={16} />}
              />
              <Input
                label="Tempo de táxi (min)"
                type="number"
                value={estimate.tempoTaxi || 10}
                onChange={(e) => setEstimate({ ...estimate, tempoTaxi: parseInt(e.target.value) })}
              />
              <Input
                label="Subida/Descida (min)"
                type="number"
                value={estimate.tempoSubidaDescida || 15}
                onChange={(e) => setEstimate({ ...estimate, tempoSubidaDescida: parseInt(e.target.value) })}
              />
              <Input
                label="Preço combustível (R$/L)"
                type="number"
                step="0.01"
                value={estimate.precoCombustivelOrigem || 8.5}
                onChange={(e) => setEstimate({ ...estimate, precoCombustivelOrigem: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <Button className="calculate-btn" onClick={handleCalculate}>
            Calcular Estimativa
          </Button>
        </Card>

        {/* Painel de Resultados */}
        <Card title="Resultados" className="results-card">
          {calculated ? (
            <>
              <div className="result-section">
                <h4>Rota</h4>
                <div className="route-summary">
                  <span className="route-origin">{estimate.origemIcao}</span>
                  <div className="route-line">
                    <span className="route-distance">{formatDistance(estimate.distanciaTotal || 0)}</span>
                  </div>
                  <span className="route-dest">{estimate.destinoIcao}</span>
                </div>
                <p className="route-names">{estimate.origem} → {estimate.destino}</p>
              </div>

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
                    <span className="result-label">Tempo Total</span>
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

              <div className="costs-section">
                <h4>Custos Estimados</h4>
                <div className="costs-breakdown">
                  <div className="cost-row">
                    <span>Combustível</span>
                    <span>{formatCurrency(estimate.custoCombustivel || 0)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Taxas de Pouso</span>
                    <span>{formatCurrency(estimate.custoTaxas || 0)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Operacional</span>
                    <span>{formatCurrency(estimate.custoOperacional || 0)}</span>
                  </div>
                  <div className="cost-row total">
                    <span>Total</span>
                    <span>{formatCurrency(estimate.custoTotal || 0)}</span>
                  </div>
                  <div className="cost-row per-hour">
                    <span>Custo por Hora</span>
                    <span>{formatCurrency(estimate.custoPorHora || 0)}</span>
                  </div>
                </div>
              </div>

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
              <Navigation size={48} />
              <p>Preencha os dados do voo e clique em "Calcular Estimativa"</p>
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
