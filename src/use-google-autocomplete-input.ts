import { useCallback, useEffect, useRef } from 'react';

import { LoaderOptions, Loader } from '@googlemaps/js-api-loader';

export const isBrowser = typeof window !== 'undefined' && window.document;

export interface UseGoogleAutocompleteInputProps {
  apiKey: string;
  apiOptions: Partial<LoaderOptions>;
  options: Partial<google.maps.places.AutocompleteOptions>;
  onPlaceSelected?: (_place: google.maps.places.PlaceResult) => void;
  onLoadFailed?: (_error: Error) => void;
}

export function UseGoogleAutocompleteInput({
  apiKey,
  options,
  apiOptions,
  onPlaceSelected,
  onLoadFailed,
}: UseGoogleAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const event = useRef(null);
  const observerHack = useRef(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete>(null);

  const setAutoComplete = useCallback(
    (position?: GeolocationPosition) => {
      let defaultBounds: google.maps.LatLngBoundsLiteral;

      if (position) {
        defaultBounds = {
          north: position.coords.latitude + 0.1,
          south: position.coords.latitude - 0.1,
          east: position.coords.longitude + 0.1,
          west: position.coords.longitude - 0.1,
        };
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        bounds: defaultBounds,
        ...options,
      });

      event.current = autocompleteRef.current.addListener('place_changed', () => {
        if (isBrowser && autocompleteRef && autocompleteRef.current) {
          onPlaceSelected(autocompleteRef.current.getPlace());
        }
      });
    },
    [onPlaceSelected, options]
  );

  const initializeService = useCallback(() => {
    if (autocompleteRef.current || !inputRef.current || !isBrowser) return;

    if (!google) {
      throw new Error('[use-google-autocomplete-widget]: Google script not loaded');
    }
    if (!google.maps) {
      throw new Error('[use-google-autocomplete-widget]: Google maps script not loaded');
    }
    if (!google.maps.places) {
      throw new Error('[use-google-autocomplete-widget]: Google maps places script not loaded');
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(setAutoComplete, () => setAutoComplete(), {
        enableHighAccuracy: false,
      });
    } else {
      setAutoComplete();
    }
  }, [setAutoComplete]);

  useEffect(() => {
    const init = async () => {
      try {
        await new Loader({
          apiKey,
          ...{ libraries: ['places'], ...apiOptions },
        }).load();

        initializeService();
      } catch (error) {
        onLoadFailed(error);
      }
    };

    init();

    observerHack.current = new MutationObserver(() => {
      observerHack.current.disconnect();
      inputRef.current.autocomplete = 'new-password';
    });

    observerHack.current.observe(inputRef.current, {
      attributes: true,
      attributeFilter: ['autocomplete'],
    });

    return () => (event.current ? event.current.remove() : undefined);
  }, [initializeService, apiKey, apiOptions, onLoadFailed]);

  return {
    ref: inputRef,
  };
}
