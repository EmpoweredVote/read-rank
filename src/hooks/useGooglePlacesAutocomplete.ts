import { useState, useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function ensureConfigured(): void {
  // Only call setOptions if importLibrary hasn't been installed yet.
  // Prevents duplicate-call warning during Vite HMR.
  if (API_KEY && !window.google?.maps?.importLibrary) {
    // Use 'key' not 'apiKey' — the loader converts camelCase to snake_case
    // for URL params, so 'apiKey' becomes 'api_key' which Google rejects.
    setOptions({ key: API_KEY });
  }
}

interface UseGooglePlacesAutocompleteOptions {
  onPlaceSelected: (formattedAddress: string) => void;
}

/**
 * Attaches Google Places Autocomplete to an input ref.
 * TypeScript port of essentials/src/hooks/useGooglePlacesAutocomplete.js
 */
export default function useGooglePlacesAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  { onPlaceSelected }: UseGooglePlacesAutocompleteOptions
): { loadError: boolean } {
  const [loadError, setLoadError] = useState(false);
  const callbackRef = useRef(onPlaceSelected);
  callbackRef.current = onPlaceSelected;

  useEffect(() => {
    if (!API_KEY || !inputRef.current) {
      setLoadError(true);
      return;
    }

    let autocomplete: google.maps.places.Autocomplete | null = null;

    ensureConfigured();

    importLibrary('places')
      .then((placesLib) => {
        if (!inputRef.current) return;
        const Places = placesLib as typeof google.maps.places;
        autocomplete = new Places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components'],
          types: ['geocode'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete!.getPlace();
          if (place?.formatted_address) {
            callbackRef.current(place.formatted_address);
          }
        });
      })
      .catch(() => {
        setLoadError(true);
      });

    return () => {
      // Guard against window.google not being available during cleanup
      if (autocomplete && window.google) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [inputRef]);

  return { loadError };
}
