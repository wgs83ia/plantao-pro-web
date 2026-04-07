export type ShiftType = 'Normal' | 'Extra';

export interface Shift {
  id: string;
  hospital: string;
  location: string;
  startTime: string;
  endTime: string;
  date: string; // ISO string
  type: ShiftType;
  sector: string;
  color?: string;
}
