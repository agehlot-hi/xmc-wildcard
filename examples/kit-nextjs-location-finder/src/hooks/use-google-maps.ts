'use client';

import { useEffect, useState } from 'react';

// Global state to track Google Maps loading
let isGoogleMapsLoaded = false;
let isGoogleMapsLoading = false;
const loadingCallbacks: (() => void)[] = [];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initGoogleMapsCallback: () => void;
  }
}

/**
 * Custom hook to load Google Maps API only once across all components
 * @param apiKey - Google Maps API key
 * @returns Object with isLoaded and error states
 */
export const useGoogleMaps = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If already loaded, update state immediately
    if (isGoogleMapsLoaded || window.google) {
      isGoogleMapsLoaded = true;
      setIsLoaded(true);
      return;
    }

    // If currently loading, add callback to queue
    if (isGoogleMapsLoading) {
      const callback = () => setIsLoaded(true);
      loadingCallbacks.push(callback);
      return () => {
        const index = loadingCallbacks.indexOf(callback);
        if (index > -1) {
          loadingCallbacks.splice(index, 1);
        }
      };
    }

    // Start loading
    isGoogleMapsLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;

    // Global callback function
    window.initGoogleMapsCallback = () => {
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      setIsLoaded(true);

      // Notify all waiting components
      loadingCallbacks.forEach((callback) => callback());
      loadingCallbacks.length = 0; // Clear the array
    };

    script.onerror = () => {
      isGoogleMapsLoading = false;
      const err = new Error('Failed to load Google Maps API');
      setError(err);
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Don't remove the script as other components might still need it
      // Just clean up the callback
      window.initGoogleMapsCallback = () => {};
    };
  }, [apiKey]);

  return { isLoaded, error };
};
