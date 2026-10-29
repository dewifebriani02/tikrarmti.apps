'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X, Loader2, ChevronLeft, User, CircleDot } from 'lucide-react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'select' | 'textarea' | 'checkbox' | 'tel';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  rows?: number;
  defaultValue?: any;
  helperText?: string;
}

export interface AdminCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  title: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  submitButtonText?: string;
  isEditing?: boolean;
}

export function AdminCrudModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields,
  initialData = {},
  submitButtonText = 'Save',
  isEditing = false,
}: AdminCrudModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update formData when initialData changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const newFormData = fields.reduce((acc, field) => {
        let value = initialData?.[field.name];
        if (field.type === 'date') {
          if (value instanceof Date) {
            value = value.toISOString().slice(0, 10);
          } else if (typeof value === 'string') {
            const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              value = dateMatch[1];
            }
          }
        }
        acc[field.name] = value !== undefined && value !== null
          ? value
          : field.defaultValue ?? (field.type === 'checkbox' ? false : '');
        return acc;
      }, {} as Record<string, any>);
      setFormData(newFormData);
      setErrors({});
    }
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }

      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Invalid email format';
        }
      }

      if (field.type === 'tel' && formData[field.name]) {
        const phoneRegex = /^[0-9+\-\s()]*$/;
        if (!phoneRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Invalid phone number format';
        }
      }

      if (field.min !== undefined && formData[field.name] < field.min) {
        newErrors[field.name] = `Minimum value is ${field.min}`;
      }

      if (field.max !== undefined && formData[field.name] > field.max) {
        newErrors[field.name] = `Maximum value is ${field.max}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ _general: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData({ ...formData, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const error = errors[field.name];

    const baseInputClasses = `w-full px-0 py-0 border-none bg-transparent focus:ring-0 text-sm font-bold text-gray-900 placeholder:text-gray-300 mt-0.5 ${
      field.disabled ? 'cursor-not-allowed opacity-70' : ''
    }`;

    const renderInputWrapper = (children: React.ReactNode) => (
      <div className={`flex items-center gap-4 p-4 rounded-3xl border transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'}`}>
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-50/50 text-blue-500">
          <CircleDot className="w-5 h-5 opacity-70" />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {children}
        </div>
      </div>
    );

    switch (field.type) {
      case 'textarea':
        return renderInputWrapper(
          <textarea
            name={field.name}
            value={value ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={field.disabled}
            rows={field.rows || 2}
            className={`${baseInputClasses} resize-none`}
          />
        );

      case 'select':
        return renderInputWrapper(
          <select
            name={field.name}
            value={value ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
            disabled={field.disabled}
            className={`${baseInputClasses} cursor-pointer appearance-none`}
          >
            <option value="">Pilih {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex items-start gap-4 p-4 rounded-3xl border border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-colors group">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-50/50 text-blue-500">
              <input
                type="checkbox"
                name={field.name}
                checked={!!value}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                disabled={field.disabled}
                className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mt-2">
                {field.label}
              </span>
              {field.helperText && (
                <span className="text-xs font-medium text-gray-500 mt-0.5">
                  {field.helperText}
                </span>
              )}
            </div>
          </label>
        );

      default:
        return renderInputWrapper(
          <input
            type={field.type}
            name={field.name}
            value={value ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={field.disabled}
            min={field.min}
            max={field.max}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 bg-white flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-full bg-blue-50 text-blue-500">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h3>
                <p className="text-sm font-medium text-gray-500 mt-0.5">Update data profil / pendaftaran</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-3 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="mx-8 mt-2 mb-6 bg-[#f4f7fa] rounded-[32px] p-6 flex items-center gap-6">
            <div className="flex-shrink-0 flex items-center justify-center h-20 w-20 rounded-full bg-white text-blue-500 shadow-sm">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-black text-gray-900">{initialData?.full_name || initialData?.name || 'Profil Edit'}</h4>
              <p className="text-[11px] font-black tracking-widest uppercase text-blue-600 mt-1">
                STATUS: {initialData?.status || initialData?.selection_status || 'AKTIF'}
              </p>
            </div>
          </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-8 pb-8 overflow-y-auto max-h-[calc(85vh-160px)]">
            {errors._general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-medium text-red-600">{errors._general}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={field.type === 'textarea' || field.type === 'checkbox' ? 'md:col-span-2' : ''}
                >
                  {renderField(field)}
                  {errors[field.name] && (
                    <p className="mt-1 ml-4 text-xs font-bold text-red-500">{errors[field.name]}</p>
                  )}
                  {field.helperText && field.type !== 'checkbox' && (
                    <p className="mt-1 ml-4 text-xs font-medium text-gray-500">{field.helperText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-6 bg-white border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex items-center gap-2 font-bold text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                submitButtonText || 'Simpan, Tutup'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}
