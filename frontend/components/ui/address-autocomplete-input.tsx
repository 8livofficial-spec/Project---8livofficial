"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Loader2, Check, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AddressSuggestion {
  placeId: string;
  formattedAddress: string;
  mainText: string;
  secondaryText: string;
}

export interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = "Start typing your address...",
  className,
  name = "address",
  required = false,
}: AddressAutocompleteInputProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch address predictions (Google Places API / Geocoding fallback)
  const fetchAddressSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try Google Maps Places Autocomplete if available
      const win = typeof window !== "undefined" ? (window as any) : null;
      if (win && win.google && win.google.maps && win.google.maps.places) {
        const service = new win.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: searchQuery, types: ["address"] },
          (predictions: any[], status: string) => {
            if (
              status === win.google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              const googleSuggestions: AddressSuggestion[] = predictions.map(
                (p: any) => ({
                  placeId: p.place_id,
                  formattedAddress: p.description,
                  mainText: p.structured_formatting?.main_text || p.description,
                  secondaryText: p.structured_formatting?.secondary_text || "",
                })
              );
              setSuggestions(googleSuggestions);
              setIsOpen(true);
              setIsLoading(false);
            }
          }
        );
        return;
      }


      // 2. OpenStreetMap / Photon Live Geocoding API Fallback
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.features && Array.isArray(data.features)) {
          const photonSuggestions: AddressSuggestion[] = data.features.map(
            (feat: any, idx: number) => {
              const props = feat.properties || {};
              const mainText = [props.name, props.housenumber, props.street]
                .filter(Boolean)
                .join(" ");
              const secondaryText = [
                props.district,
                props.city || props.town,
                props.state,
                props.postcode,
                props.country,
              ]
                .filter(Boolean)
                .join(", ");
              const fullText = [mainText, secondaryText]
                .filter(Boolean)
                .join(", ");

              return {
                placeId: `photon-${idx}-${props.osm_id || Math.random()}`,
                formattedAddress: fullText || searchQuery,
                mainText: mainText || props.city || searchQuery,
                secondaryText: secondaryText || props.country || "",
              };
            }
          );
          setSuggestions(photonSuggestions);
          setIsOpen(photonSuggestions.length > 0);
        }
      }
    } catch (err) {
      console.warn("[AddressAutocomplete] Suggestion fetch fallback:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce input typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && query !== value) {
        fetchAddressSuggestions(query);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, value, fetchAddressSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.formattedAddress);
    onChange(suggestion.formattedAddress);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          required={required}
          placeholder={placeholder}
          className={cn(
            "w-full bg-[#F9F6F0] border-2 border-[#D46E53]/10 text-[#0F172A] rounded-2xl px-5 py-4 pl-12 pr-10 focus:outline-none focus:border-[#0D9488] focus:ring-4 focus:ring-[#0D9488]/20 transition-all font-medium placeholder:text-[#475569]/50 text-sm",
            className
          )}
        />
        <MapPin className="w-5 h-5 text-[#0D9488] absolute left-4 pointer-events-none" />

        {isLoading ? (
          <Loader2 className="w-4 h-4 text-[#0D9488] animate-spin absolute right-4 pointer-events-none" />
        ) : (
          query.length > 0 && (
            <Navigation className="w-4 h-4 text-[#0D9488] absolute right-4 pointer-events-none" />
          )
        )}
      </div>

      {/* Address Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#0D9488] font-sora">
            <span>Suggested Places</span>
            <span>Google Maps / GPS</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((item) => (
              <button
                key={item.placeId}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left p-3.5 hover:bg-[#0D9488]/5 transition-colors flex items-start gap-3 cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#0D9488] group-hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#0F172A] font-sora truncate group-hover:text-[#0D9488] transition-colors">
                    {item.mainText}
                  </p>
                  {item.secondaryText && (
                    <p className="text-[11px] text-[#475569] font-light truncate mt-0.5">
                      {item.secondaryText}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AddressAutocompleteInput;
