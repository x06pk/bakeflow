import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const number = (value: unknown, digits = 2) => Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
export const money = (value: unknown) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
