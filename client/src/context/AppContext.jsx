import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [recordToEdit, setRecordToEdit] = useState(null);

  return (
    <AppContext.Provider value={{ recordToEdit, setRecordToEdit }}>
      {children}
    </AppContext.Provider>
  );
};
