import React, { createContext, useContext, useEffect, useState } from 'react';
import { listenMenu, listenInsumos, listenConfig } from './firestore';

const AppContext = createContext(null);

const CONFIG_DEFAULT = {
  nombre: 'WIMPY',
  ownerPin: null,
  ticketDireccion: '',
  ticketMensaje: '¡Gracias por su compra!',
};

export function AppProvider({ children }) {
  const [role, setRole] = useState(null); // 'owner' | 'employee' | null
  const [menu, setMenu] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [config, setConfig] = useState(CONFIG_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubMenu = listenMenu(setMenu);
    const unsubInsumos = listenInsumos(setInsumos);
    const unsubConfig = listenConfig((data) => {
      setConfig({ ...CONFIG_DEFAULT, ...(data || {}) });
      setLoading(false);
    });
    return () => {
      unsubMenu();
      unsubInsumos();
      unsubConfig();
    };
  }, []);

  const value = {
    role, setRole,
    menu, insumos, config, setConfig,
    loading,
    isOwner: role === 'owner',
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
