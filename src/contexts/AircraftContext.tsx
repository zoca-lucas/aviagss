import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Aircraft } from '../types';
import { storage } from '../services/storage';

interface AircraftContextType {
  aircrafts: Aircraft[];
  selectedAircraft: Aircraft | null;
  selectAircraft: (id: string | null) => void;
  refreshAircrafts: () => void;
}

const AircraftContext = createContext<AircraftContextType | undefined>(undefined);

export function AircraftProvider({ children }: { children: ReactNode }) {
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);

  const refreshAircrafts = () => {
    const loadedAircrafts = storage.getAircraft().filter(a => a.active);
    setAircrafts(loadedAircrafts);
    
    // Se a aeronave selecionada não existe mais, selecionar a primeira
    if (selectedAircraft && !loadedAircrafts.find(a => a.id === selectedAircraft.id)) {
      setSelectedAircraft(loadedAircrafts[0] || null);
    } else if (!selectedAircraft && loadedAircrafts.length > 0) {
      setSelectedAircraft(loadedAircrafts[0]);
    }
  };

  useEffect(() => {
    refreshAircrafts();
  }, []);

  const selectAircraft = (id: string | null) => {
    if (id) {
      const aircraft = aircrafts.find(a => a.id === id);
      setSelectedAircraft(aircraft || null);
    } else {
      setSelectedAircraft(null);
    }
  };

  return (
    <AircraftContext.Provider
      value={{
        aircrafts,
        selectedAircraft,
        selectAircraft,
        refreshAircrafts,
      }}
    >
      {children}
    </AircraftContext.Provider>
  );
}

export function useAircraft() {
  const context = useContext(AircraftContext);
  if (context === undefined) {
    throw new Error('useAircraft must be used within an AircraftProvider');
  }
  return context;
}
