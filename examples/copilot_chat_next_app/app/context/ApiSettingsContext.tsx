"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface ApiSettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  verbosity: string;
  setVerbosity: (level: string) => void;
  streamFormat: string;
  setStreamFormat: (format: string) => void;
}

const defaultContext: ApiSettingsContextType = {
  apiKey: "",
  setApiKey: () => {},
  verbosity: "balanced",
  setVerbosity: () => {},
  streamFormat: "openai",
  setStreamFormat: () => {},
};

const ApiSettingsContext =
  createContext<ApiSettingsContextType>(defaultContext);

export const useApiSettings = () => useContext(ApiSettingsContext);

interface ApiSettingsProviderProps {
  children: ReactNode;
}

export const ApiSettingsProvider: React.FC<ApiSettingsProviderProps> = ({
  children,
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [verbosity, setVerbosity] = useState<string>("balanced");
  const [streamFormat, setStreamFormat] = useState<string>("openai");

  return (
    <ApiSettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        verbosity,
        setVerbosity,
        streamFormat,
        setStreamFormat,
      }}
    >
      {children}
    </ApiSettingsContext.Provider>
  );
};
