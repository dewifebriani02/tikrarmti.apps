'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';
import { CountryCode, countryCodes, getCountryCodeByName } from '@/lib/data/country-codes';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedCountry?: string;
  onCountryChange?: (countryCode: string) => void;
  required?: boolean;
  error?: string;
  id?: string;
  label?: string;
  disabled?: boolean;
}

const sortedCountryCodes = [...countryCodes].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
);

export function PhoneInput({
  value,
  onChange,
  placeholder = 'Nomor telepon',
  selectedCountry,
  onCountryChange,
  required = false,
  error,
  id,
  label,
  disabled = false
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(countryCodes[0]); // Default to Indonesia
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update country when selectedCountry prop changes
  useEffect(() => {
    if (!isMounted) return;

    if (selectedCountry) {
      const countryData = getCountryCodeByName(selectedCountry);
      if (countryData) {
        setCountry(countryData);
        if (onCountryChange) {
          onCountryChange(countryData.code);
        }
        if (phoneNumber) {
          const fullNumber = `${countryData.dialCode}${phoneNumber}`;
          if (fullNumber !== value) {
            onChange(fullNumber);
          }
        }
      }
    }
  }, [selectedCountry, onCountryChange, isMounted]);

  // Initialize phone number from value prop
  useEffect(() => {
    if (!isMounted) return;

    if (value) {
      // Extract country code if present (longest dialCode prefix first)
      const countryData = sortedCountryCodes.find(cc => value.startsWith(cc.dialCode));
      if (countryData) {
        setCountry(countryData);
        setPhoneNumber(value.substring(countryData.dialCode.length));
      } else {
        // Try to match with selected country
        if (value.startsWith(country.dialCode)) {
          setPhoneNumber(value.substring(country.dialCode.length));
        } else {
          setPhoneNumber(value);
        }
      }
    } else {
      setPhoneNumber('');
    }
  }, [value, country.dialCode, isMounted]);

  const handleCountryChange = (countryName: string) => {
    const newCountry = getCountryCodeByName(countryName);
    if (newCountry) {
      setCountry(newCountry);
      if (onCountryChange) {
        onCountryChange(newCountry.code);
      }
      // Update the full phone number with new country code
      const fullNumber = phoneNumber ? `${newCountry.dialCode}${phoneNumber}` : '';
      onChange(fullNumber);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Allow only digits and some formatting characters
    newValue = newValue.replace(/[^\d\s\-\(\)]/g, '');

    // Remove leading zeros (common mistake for users)
    newValue = newValue.replace(/^0+/, '');

    setPhoneNumber(newValue);

    // Construct full phone number
    const fullNumber = newValue ? `${country.dialCode}${newValue}` : '';
    onChange(fullNumber);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13].includes(e.keyCode)) {
      return;
    }

    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ([65, 67, 86, 88].includes(e.keyCode) && (e.ctrlKey || e.metaKey)) {
      return;
    }

    // Allow home, end, left, right arrows
    if ([35, 36, 37, 39].includes(e.keyCode)) {
      return;
    }

    // Only allow numbers and formatting keys
    if (!/\d/.test(e.key) && ![' ', '-', '(', ')'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="flex">
        <div className="relative">
          <Select
            value={country.name}
            onValueChange={handleCountryChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-auto pr-8 rounded-r-none border-r-0 focus:ring-0">
              <SelectValue>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-xs sm:text-sm font-medium">{country.dialCode}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {countryCodes.map((c) => (
                <SelectItem key={c.code} value={c.name}>
                  <div className="flex items-center space-x-2">
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                    <span className="text-gray-500 text-xs">{c.dialCode}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            id={id}
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 rounded-l-none focus:ring-0"
            disabled={disabled}
            required={required}
          />
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      <p className="text-xs text-gray-500">
        Format: {country.code} {country.dialCode} [nomor telepon]
      </p>
    </div>
  );
}
