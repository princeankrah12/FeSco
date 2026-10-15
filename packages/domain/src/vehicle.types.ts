import { EngineClass } from './svoc.js';

export interface Vehicle {
  id: string;
  hostUserId?: string;
  licensePlate?: string;
  chassisNumber?: string;
  engineClass?: EngineClass;
  svocPerSeatCeilingPesewas: number;
}
