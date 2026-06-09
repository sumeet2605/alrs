import React, { createContext, useContext, useEffect, useState } from "react";

export type Branding = {
  logo_path?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  theme_mode?: string;
};

const BrandingContext = createContext<Branding | null>(null);

export const BrandingProvider = ({ children }: { children: React.ReactNode }) => {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/api/brand`)
      .then(res => res.json())
      .then(data => setBranding(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!branding) return;

    document.documentElement.style.setProperty(
      "--primary",
      branding.primary_color ?? "#e9c6c3"
    );

    document.documentElement.style.setProperty(
      "--secondary",
      branding.secondary_color ?? "#f4e4dc"
    );

    document.documentElement.style.setProperty(
      "--accent",
      branding.accent_color ?? "#c88a8a"
    );
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
