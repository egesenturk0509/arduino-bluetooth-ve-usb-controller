/**
 * Bluetooth ve Arduino komut sabitlerini ve tiplerini içeren dosya.
 */

export const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

export enum Command {
  FORWARD = "F",
  BACKWARD = "B",
  LEFT = "L",
  RIGHT = "R",
  PARK_SENSOR = "C",
  EMERGENCY_STOP = "X",
  HEADLIGHTS = "T",
  STATUS = "S",
  START_SYSTEM = "A",
  WATER_PUMP = "P"
}

export type ConnectionStatus = "Bağlı Değil" | "Bağlanıyor..." | "Bağlandı" | "Hata" | "Desteklenmiyor";

export interface BluetoothDeviceState {
  deviceName: string | null;
  status: ConnectionStatus;
  error: string | null;
  isConnected: boolean;
}