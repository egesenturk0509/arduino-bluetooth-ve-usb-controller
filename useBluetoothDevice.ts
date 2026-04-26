/**
 * Web Bluetooth API aracılığıyla Arduino ile iletişimi sağlayan hook.
 */

"use client";

import { useState, useCallback } from "react";
import { SERVICE_UUID, CHARACTERISTIC_UUID, BluetoothDeviceState, ConnectionStatus } from "./bluetooth";

// Web Bluetooth API için global tip tanımlamaları
declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }

  interface Bluetooth extends EventTarget {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface RequestDeviceOptions {
    filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }

  interface BluetoothDevice extends EventTarget {
    readonly id: string;
    readonly name?: string;
    readonly gatt?: BluetoothRemoteGATTServer;
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    readonly service: BluetoothRemoteGATTService;
    readonly uuid: string;
    readonly value?: DataView;
    writeValue(value: BufferSource): Promise<void>;
  }
}

export const useBluetoothDevice = () => {
  const [deviceState, setDeviceState] = useState<BluetoothDeviceState>({
    deviceName: null,
    status: "Bağlı Değil",
    error: null,
    isConnected: false,
  });

  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);

  const connectToDevice = async () => {
    if (!navigator.bluetooth) {
      setDeviceState((prev: BluetoothDeviceState) => ({ ...prev, status: "Desteklenmiyor", error: "Tarayıcı Bluetooth desteklemiyor." }));
      return;
    }

    try {
      setDeviceState((prev: BluetoothDeviceState) => ({ ...prev, status: "Bağlanıyor...", error: null }));

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService(SERVICE_UUID);
      const char = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      if (char) {
        setCharacteristic(char);
        setDeviceState({
          deviceName: device.name || "Bilinmeyen Cihaz",
          status: "Bağlandı",
          error: null,
          isConnected: true,
        });

        // Bağlantı kesilme olayını dinle
        device.addEventListener("gattserverdisconnected", () => {
          setDeviceState({ deviceName: null, status: "Bağlı Değil", error: null, isConnected: false });
          setCharacteristic(null);
        });
      }
    } catch (err: any) {
      setDeviceState((prev: BluetoothDeviceState) => ({
        ...prev,
        status: "Hata",
        error: err.name === "NotFoundError" ? "Cihaz seçilmedi." : "Bağlantı hatası: " + err.message,
      }));
    }
  };

  const disconnectDevice = useCallback(() => {
    if (characteristic?.service?.device?.gatt?.connected) {
      characteristic.service.device.gatt.disconnect();
    }
    setDeviceState({ deviceName: null, status: "Bağlı Değil", error: null, isConnected: false });
    setCharacteristic(null);
  }, [characteristic]);

  const sendCommand = useCallback(
    async (cmd: string) => {
      if (!characteristic) return;

      try {
        const encoder = new TextEncoder();
        await characteristic.writeValue(encoder.encode(cmd));
      } catch (err: any) {
        console.error("Veri gönderilemedi:", err);
        // Bağlantı kopmuş olabilir
        if (!characteristic.service.device.gatt?.connected) {
          disconnectDevice();
        }
      }
    },
    [characteristic, disconnectDevice]
  );

  return {
    ...deviceState,
    connectToDevice,
    disconnectDevice,
    sendCommand,
  };
};