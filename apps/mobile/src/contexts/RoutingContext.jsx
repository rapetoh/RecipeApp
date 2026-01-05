import { createContext, useContext, useState } from 'react';

const RoutingContext = createContext({
  isRoutingComplete: false,
  setRoutingComplete: () => {},
});

export function useRoutingContext() {
  return useContext(RoutingContext);
}

export function RoutingProvider({ children }) {
  const [isRoutingComplete, setRoutingComplete] = useState(false);

  return (
    <RoutingContext.Provider value={{ isRoutingComplete, setRoutingComplete }}>
      {children}
    </RoutingContext.Provider>
  );
}

