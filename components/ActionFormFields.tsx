'use client';

import { useState, useEffect } from 'react';
import { neoStyles, buttonVariants } from '@/lib/neoBrutalismStyles';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ActionFormFieldsProps {
  action: {
    id: string;
    name: string;
    args: any;
    description: string;
    parameters?: any;
  };
  onArgsChange: (args: any) => void;
}

export default function ActionFormFields({ action, onArgsChange }: ActionFormFieldsProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [localArgs, setLocalArgs] = useState(action.args || {});

  useEffect(() => {
    onArgsChange(localArgs);
  }, [localArgs, onArgsChange]);

  const renderField = (key: string, schema: any, value: any, path: string = '') => {
    const fullPath = path ? `${path}.${key}` : key;
    const fieldSchema = schema.properties?.[key] || schema.items?.properties?.[key] || {};
    const fieldType = fieldSchema.type || typeof value;
    const isRequired = schema.required?.includes(key) || false;
    const fieldDescription = fieldSchema.description || '';

    if (fieldType === 'object' && fieldSchema.properties) {
      return (
        <div key={key} style={{ marginBottom: '1rem', padding: '0.75rem', border: '2px solid #000', borderRadius: '0' }}>
          <div style={{ fontWeight: '700', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            {key}
          </div>
          {Object.keys(fieldSchema.properties).map((subKey) =>
            renderField(subKey, fieldSchema, localArgs[key]?.[subKey] || '', fullPath)
          )}
        </div>
      );
    }

    if (fieldType === 'array' && fieldSchema.items) {
      const arrayValue = Array.isArray(value) ? value : [];
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
            {key} {isRequired && <span style={{ color: '#FF6B6B' }}>*</span>}
            {fieldDescription && <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '400', display: 'block', marginTop: '0.25rem' }}>{fieldDescription}</span>}
          </label>
          {arrayValue.map((item: any, idx: number) => (
            <div key={idx} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#F5F5F5', border: '1px solid #000' }}>
              {fieldSchema.items.type === 'object' ? (
                Object.keys(fieldSchema.items.properties || {}).map((subKey) =>
                  renderField(subKey, fieldSchema.items, item?.[subKey] || '', `${fullPath}[${idx}]`)
                )
              ) : (
                <input
                  type="text"
                  value={item || ''}
                  onChange={(e) => {
                    const newArray = [...arrayValue];
                    newArray[idx] = e.target.value;
                    const newArgs = { ...localArgs };
                    if (path) {
                      const pathParts = path.split('.');
                      let current: any = newArgs;
                      for (let i = 0; i < pathParts.length - 1; i++) {
                        current = current[pathParts[i]] = current[pathParts[i]] || {};
                      }
                      current[pathParts[pathParts.length - 1]] = newArray;
                    } else {
                      newArgs[key] = newArray;
                    }
                    setLocalArgs(newArgs);
                  }}
                  style={{
                    ...neoStyles.input,
                    width: '100%',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  const newArray = arrayValue.filter((_: any, i: number) => i !== idx);
                  const newArgs = { ...localArgs };
                  if (path) {
                    const pathParts = path.split('.');
                    let current: any = newArgs;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                      current = current[pathParts[i]] = current[pathParts[i]] || {};
                    }
                    current[pathParts[pathParts.length - 1]] = newArray;
                  } else {
                    newArgs[key] = newArray;
                  }
                  setLocalArgs(newArgs);
                }}
                style={{
                  ...neoStyles.button,
                  ...buttonVariants.danger,
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newArray = [...arrayValue];
              if (fieldSchema.items.type === 'object') {
                const newItem: any = {};
                Object.keys(fieldSchema.items.properties || {}).forEach((subKey) => {
                  newItem[subKey] = '';
                });
                newArray.push(newItem);
              } else {
                newArray.push('');
              }
              const newArgs = { ...localArgs };
              if (path) {
                const pathParts = path.split('.');
                let current: any = newArgs;
                for (let i = 0; i < pathParts.length - 1; i++) {
                  current = current[pathParts[i]] = current[pathParts[i]] || {};
                }
                current[pathParts[pathParts.length - 1]] = newArray;
              } else {
                newArgs[key] = newArray;
              }
              setLocalArgs(newArgs);
            }}
            style={{
              ...neoStyles.button,
              ...buttonVariants.neutral,
              padding: '0.5rem 1rem',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              marginTop: '0.5rem',
            }}
          >
            + Add {key.slice(0, -1)}
          </button>
        </div>
      );
    }

    const inputType = fieldType === 'number' ? 'number' : fieldType === 'date' || key.toLowerCase().includes('date') ? 'date' : 'text';

    return (
      <div key={key} style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
          {key} {isRequired && <span style={{ color: '#FF6B6B' }}>*</span>}
          {fieldDescription && <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '400', display: 'block', marginTop: '0.25rem' }}>{fieldDescription}</span>}
        </label>
        {fieldSchema.enum ? (
          <select
            value={value || ''}
            onChange={(e) => {
              const newArgs = { ...localArgs };
              if (path) {
                const pathParts = path.split('.');
                let current: any = newArgs;
                for (let i = 0; i < pathParts.length - 1; i++) {
                  current = current[pathParts[i]] = current[pathParts[i]] || {};
                }
                current[pathParts[pathParts.length - 1]] = e.target.value;
              } else {
                newArgs[key] = e.target.value;
              }
              setLocalArgs(newArgs);
            }}
            style={{
              ...neoStyles.input,
              width: '100%',
              fontSize: isMobile ? '0.875rem' : '1rem',
            }}
          >
            <option value="">Select...</option>
            {fieldSchema.enum.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : inputType === 'text' && (key.toLowerCase().includes('message') || key.toLowerCase().includes('description') || key.toLowerCase().includes('text')) ? (
          <textarea
            value={value || ''}
            onChange={(e) => {
              const newArgs = { ...localArgs };
              if (path) {
                const pathParts = path.split('.');
                let current: any = newArgs;
                for (let i = 0; i < pathParts.length - 1; i++) {
                  current = current[pathParts[i]] = current[pathParts[i]] || {};
                }
                current[pathParts[pathParts.length - 1]] = e.target.value;
              } else {
                newArgs[key] = e.target.value;
              }
              setLocalArgs(newArgs);
            }}
            rows={isMobile ? 3 : 4}
            style={{
              ...neoStyles.input,
              width: '100%',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        ) : (
          <input
            type={inputType}
            value={value || ''}
            onChange={(e) => {
              const newArgs = { ...localArgs };
              const newValue = inputType === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
              if (path) {
                const pathParts = path.split('.');
                let current: any = newArgs;
                for (let i = 0; i < pathParts.length - 1; i++) {
                  current = current[pathParts[i]] = current[pathParts[i]] || {};
                }
                current[pathParts[pathParts.length - 1]] = newValue;
              } else {
                newArgs[key] = newValue;
              }
              setLocalArgs(newArgs);
            }}
            style={{
              ...neoStyles.input,
              width: '100%',
              fontSize: isMobile ? '0.875rem' : '1rem',
            }}
          />
        )}
      </div>
    );
  };

  if (!action.parameters || !action.parameters.properties) {
    return (
      <div style={{ fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
        No editable fields available
      </div>
    );
  }

  return (
    <div>
      {Object.keys(action.parameters.properties).map((key) =>
        renderField(key, action.parameters, localArgs[key] || '')
      )}
    </div>
  );
}
