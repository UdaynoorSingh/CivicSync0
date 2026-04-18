export const calculateSLA = (urgency: string): Date => {
    const now = Date.now();
    const ONE_HOUR_IN_MS = 60 * 60 * 1000;
  
    switch (urgency.toLowerCase()) {
      case "high":
        // Breach in 24 hours
        return new Date(now + 24 * ONE_HOUR_IN_MS);
        
      case "medium":
        // Breach in 48 hours
        return new Date(now + 48 * ONE_HOUR_IN_MS);
        
      case "low":
        // Breach in 72 hours
        return new Date(now + 72 * ONE_HOUR_IN_MS);
        
      default:
        // Fallback to a standard 48-hour SLA if an unknown value is passed
        return new Date(now + 48 * ONE_HOUR_IN_MS);
    }
  };