# ESP32 Library Access Control - Hardware & Flashing Guide

## 1. Pin Connection & Schematic

| Component | Pin Label | ESP32 GPIO | Notes |
| :--- | :--- | :--- | :--- |
| **RC522 RFID** | VCC | 3.3V | **Do NOT connect to 5V!** |
| | RST | GPIO 22 | Reset Pin |
| | GND | GND | Ground |
| | MISO | GPIO 19 | SPI MISO |
| | MOSI | GPIO 23 | SPI MOSI |
| | SCK | GPIO 18 | SPI Clock |
| | SDA (SS) | GPIO 5 | Chip Select |
| **Green LED** | Anode (+) | GPIO 16 | Current limit resistor 220Ω to GND |
| **Red LED** | Anode (+) | GPIO 17 | Current limit resistor 220Ω to GND |
| **Active Buzzer** | (+) Pin | GPIO 4 | (-) to GND |
| **Relay Module** | Signal (IN) | GPIO 2 | VCC to 5V (VIN), GND to GND |

---

## 2. PlatformIO Configuration & Upload

1. Install **Visual Studio Code** and the **PlatformIO IDE** extension.
2. Open the `firmware/` directory in VS Code.
3. Edit `src/main.cpp` to configure:
   - `WIFI_SSID`: Your Wi-Fi network name.
   - `WIFI_PASSWORD`: Your Wi-Fi password.
   - `SERVER_BASE_URL`: IP or domain of your FastAPI Backend (e.g. `http://192.168.1.50:8000`).
   - `DEVICE_API_KEY`: Must match `DEVICE_API_KEY` in backend `.env`.
4. Connect the ESP32 board to your computer via USB.
5. Click the **PlatformIO: Upload** arrow icon in the bottom status bar, or run:
   ```bash
   pio run --target upload
   ```
6. Open the serial monitor at **115200 baud** to see live boot and scan logs:
   ```bash
   pio device monitor
   ```
