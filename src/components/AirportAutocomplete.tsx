import { useState, useEffect, useRef } from 'react';
import { MapPin, X } from 'lucide-react';
import { AirportRecord } from '../types';
import { airportService } from '../services/airports';
import './AirportAutocomplete.css';

interface AirportAutocompleteProps {
  label: string;
  value?: string; // ICAO code
  onChange: (airport: AirportRecord | null) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  country?: string; // Filtrar por país (ex: "BR")
}

export default function AirportAutocomplete({
  label,
  value,
  onChange,
  placeholder = 'Digite a cidade ou código do aeroporto...',
  hint,
  required,
  country = 'BR',
}: AirportAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [airports, setAirports] = useState<AirportRecord[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<AirportRecord | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega aeroportos na inicialização
  useEffect(() => {
    const load = async () => {
      try {
        await airportService.loadAirports();
      } catch (error) {
        console.error('Erro ao carregar aeroportos:', error);
      }
    };
    load();
  }, []);

  // Busca aeroporto por ICAO quando value muda externamente
  useEffect(() => {
    if (value && !selectedAirport) {
      const airport = airportService.findByCode(value);
      if (airport) {
        setSelectedAirport(airport);
        setSearchQuery(`${airport.name} (${airport.ident})`);
      }
    }
  }, [value, selectedAirport]);

  // Busca aeroportos quando o usuário digita
  useEffect(() => {
    if (searchQuery.length < 2) {
      setAirports([]);
      setShowDropdown(false);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const results = airportService.filterAirports({
          country,
          searchQuery,
        });
        
        // Limita a 10 resultados
        setAirports(results.slice(0, 10));
        setShowDropdown(true);
      } catch (error) {
        console.error('Erro ao buscar aeroportos:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 300); // Debounce de 300ms
    return () => clearTimeout(timeoutId);
  }, [searchQuery, country]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (airport: AirportRecord) => {
    setSelectedAirport(airport);
    setSearchQuery(`${airport.name} (${airport.ident})`);
    setShowDropdown(false);
    onChange(airport);
  };

  const handleClear = () => {
    setSelectedAirport(null);
    setSearchQuery('');
    setAirports([]);
    setShowDropdown(false);
    onChange(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Se limpar o input, limpa a seleção
    if (!query) {
      setSelectedAirport(null);
      onChange(null);
    }
  };

  return (
    <div className="airport-autocomplete-wrapper" ref={wrapperRef}>
      <label className="input-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      
      <div className="airport-autocomplete-container">
        <MapPin size={16} className="airport-input-icon" />
        <input
          ref={inputRef}
          type="text"
          className="airport-autocomplete-input"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (airports.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        {selectedAirport && (
          <button
            type="button"
            className="airport-clear-btn"
            onClick={handleClear}
            title="Limpar seleção"
          >
            <X size={14} />
          </button>
        )}
        
        {showDropdown && (
          <div className="airport-dropdown">
            {loading ? (
              <div className="airport-dropdown-loading">Buscando aeroportos...</div>
            ) : airports.length === 0 ? (
              <div className="airport-dropdown-empty">
                {searchQuery.length < 2 
                  ? 'Digite pelo menos 2 caracteres'
                  : 'Nenhum aeroporto encontrado'}
              </div>
            ) : (
              airports.map((airport) => (
                <button
                  key={airport.id}
                  type="button"
                  className={`airport-option ${selectedAirport?.id === airport.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(airport)}
                >
                  <div className="airport-option-main">
                    <span className="airport-option-name">{airport.name}</span>
                    <span className="airport-option-code">{airport.ident}</span>
                  </div>
                  <div className="airport-option-details">
                    {airport.municipality && (
                      <span className="airport-option-city">{airport.municipality}</span>
                    )}
                    {airport.iso_region && (
                      <span className="airport-option-region">
                        {airport.iso_region.split('-')[1] || airport.iso_region}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      
      {hint && !selectedAirport && (
        <span className="input-hint">{hint}</span>
      )}
      
      {selectedAirport && (
        <div className="airport-selected-info">
          <span className="airport-selected-label">Aeroporto selecionado:</span>
          <span className="airport-selected-value">
            {selectedAirport.name} <strong>({selectedAirport.ident})</strong>
          </span>
        </div>
      )}
    </div>
  );
}
