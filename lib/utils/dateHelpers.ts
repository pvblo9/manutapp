/**
 * Funções utilitárias para manipulação de datas sem problemas de timezone
 */

/**
 * Converte string de input date (YYYY-MM-DD) para Date sem problemas de timezone
 * @param dateString - String no formato YYYY-MM-DD
 * @returns Date no horário local 00:00:00
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Converte Date para string no formato YYYY-MM-DD para input date
 * @param date - Objeto Date
 * @returns String no formato YYYY-MM-DD
 */
export function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converte string de input date para ISO string preservando a data local
 * @param dateString - String no formato YYYY-MM-DD
 * @returns ISO string da data no horário local
 */
export function dateInputToISO(dateString: string): string {
  if (!dateString) return new Date().toISOString();
  
  const localDate = parseLocalDate(dateString);
  return localDate.toISOString();
}
