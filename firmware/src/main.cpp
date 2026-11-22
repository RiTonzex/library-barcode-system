/**
 * ==============================================================================
 * LIBRARY ATTENDANCE SCANNER - ESP32 FIRMWARE
 * ==============================================================================
 * หน้าที่:
 *   - รับข้อมูลบาร์โค้ด / RFID จากเครื่องสแกน
 *   - ยิงข้อมูลรหัสนักศึกษาขึ้นเซิร์ฟเวอร์เพื่อถอดรหัสคณะ/สาขา และซิงก์ Google Sheets
 *   - มีเสียงบี๊บ 1 ครั้ง (80ms) แจ้งเตือนว่าสแกนสำเร็จ
 *   - มี Offline Retry Queue กรณีเน็ตหลุด (ยิงย้อนหลังทันทีเมื่อเน็ตกลับมา)
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// ==============================================================================
// CONFIGURATION (ปรับแก้ตามเครือข่ายของคุณ)
// ==============================================================================
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";

// Server API Endpoint
const char* SERVER_BASE_URL = "http://192.168.1.100:8000";
const char* DEVICE_API_KEY  = "lib_esp32_secret_key_prod_998877";
const char* DEVICE_ID       = "ESP32_LIBRARY_SCANNER_01";

// Pin Definitions
#define PIN_RC522_SS     5    // RC522 SDA
#define PIN_RC522_RST    22   // RC522 RST
#define PIN_RC522_SCK    18   // SPI SCK
#define PIN_RC522_MISO   19   // SPI MISO
#define PIN_RC522_MOSI   23   // SPI MOSI

#define PIN_LED_GREEN    16   // ไฟแจ้งสถานะสแกนสำเร็จ
#define PIN_BUZZER       4    // Active Buzzer

MFRC522 mfrc522(PIN_RC522_SS, PIN_RC522_RST);

// Offline Queue
#define OFFLINE_QUEUE_CAPACITY 50
struct QueuedScan {
    char barcode[24];
};
QueuedScan offlineQueue[OFFLINE_QUEUE_CAPACITY];
int queueHead = 0;
int queueTail = 0;
int queueCount = 0;

unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 60000;
unsigned long ledOffTime = 0;
bool isLedActive = false;
unsigned long lastWifiCheck = 0;

void enqueueOfflineScan(const char* code) {
    if (queueCount >= OFFLINE_QUEUE_CAPACITY) {
        queueHead = (queueHead + 1) % OFFLINE_QUEUE_CAPACITY;
        queueCount--;
    }
    strncpy(offlineQueue[queueTail].barcode, code, sizeof(offlineQueue[queueTail].barcode) - 1);
    queueTail = (queueTail + 1) % OFFLINE_QUEUE_CAPACITY;
    queueCount++;
    Serial.printf("[QUEUE] บันทึกออฟไลน์: %s (ค้างส่ง: %d รายการ)\n", code, queueCount);
}

void triggerBeep(int durationMs = 80) {
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_LED_GREEN, HIGH);
    isLedActive = true;
    ledOffTime = millis() + 500;
    delay(durationMs);
    digitalWrite(PIN_BUZZER, LOW);
}

void connectWifi() {
    if (WiFi.status() == WL_CONNECTED) return;
    Serial.printf("[WIFI] กำลังเชื่อมต่อ %s...", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WIFI] เชื่อมต่อสำเร็จ! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WIFI] ไม่สามารถเชื่อมต่อเน็ตได้ (เข้าสู่โหมดออฟไลน์)");
    }
}

bool sendBarcodeScan(const char* barcode) {
    if (WiFi.status() != WL_CONNECTED) {
        enqueueOfflineScan(barcode);
        triggerBeep(80);
        return false;
    }

    HTTPClient http;
    String url = String(SERVER_BASE_URL) + "/api/v1/scan/barcode";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", DEVICE_API_KEY);
    http.setTimeout(2500);

    JsonDocument doc;
    doc["barcode"] = barcode;
    String requestBody;
    serializeJson(doc, requestBody);

    int httpCode = http.POST(requestBody);
    http.end();

    if (httpCode == 200) {
        Serial.printf("[SCAN] บันทึกสำเร็จ: %s\n", barcode);
        triggerBeep(80); // บี๊บสั้น 1 ครั้งแจ้งเตือนผู้ใช้
        return true;
    } else {
        Serial.printf("[ERROR] ส่งไม่สำเร็จ (HTTP %d) เก็บเข้าคิวออฟไลน์\n", httpCode);
        enqueueOfflineScan(barcode);
        triggerBeep(80);
        return false;
    }
}

void flushOfflineQueue() {
    if (WiFi.status() != WL_CONNECTED || queueCount == 0) return;
    Serial.printf("[FLUSH] กำลังส่งข้อมูลค้าง %d รายการ...\n", queueCount);
    while (queueCount > 0 && WiFi.status() == WL_CONNECTED) {
        QueuedScan scan = offlineQueue[queueHead];
        queueHead = (queueHead + 1) % OFFLINE_QUEUE_CAPACITY;
        queueCount--;

        HTTPClient http;
        String url = String(SERVER_BASE_URL) + "/api/v1/scan/barcode";
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("X-API-KEY", DEVICE_API_KEY);
        http.setTimeout(2000);

        JsonDocument doc;
        doc["barcode"] = scan.barcode;
        String requestBody;
        serializeJson(doc, requestBody);
        http.POST(requestBody);
        http.end();
        delay(100);
    }
}

void sendHeartbeat() {
    if (WiFi.status() != WL_CONNECTED) return;
    HTTPClient http;
    String url = String(SERVER_BASE_URL) + "/api/v1/scan/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", DEVICE_API_KEY);
    http.setTimeout(3000);

    JsonDocument doc;
    doc["device_id"]  = DEVICE_ID;
    doc["ip_address"] = WiFi.localIP().toString();
    doc["rssi"]       = WiFi.RSSI();
    doc["free_heap"]  = ESP.getFreeHeap();
    doc["uptime_sec"] = millis() / 1000;

    String body;
    serializeJson(doc, body);
    http.POST(body);
    http.end();
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- ระบบสแกนสถิติห้องสมุด (ESP32) ---");

    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_BUZZER, LOW);

    SPI.begin(PIN_RC522_SCK, PIN_RC522_MISO, PIN_RC522_MOSI, PIN_RC522_SS);
    mfrc522.PCD_Init();

    connectWifi();
    triggerBeep(80);
}

void loop() {
    unsigned long currentMillis = millis();

    // เช็กเน็ต & ทยอยส่งข้อมูลค้าง
    if (currentMillis - lastWifiCheck > 10000) {
        lastWifiCheck = currentMillis;
        if (WiFi.status() != WL_CONNECTED) {
            connectWifi();
        } else if (queueCount > 0) {
            flushOfflineQueue();
        }
    }

    // Ping Heartbeat ทุก 1 นาที
    if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatTime = currentMillis;
        sendHeartbeat();
    }

    // ปิดไฟ LED
    if (isLedActive && currentMillis >= ledOffTime) {
        digitalWrite(PIN_LED_GREEN, LOW);
        isLedActive = false;
    }

    // 1. รับค่าจากเครื่องสแกนบาร์โค้ดผ่าน Serial (ถ้าต่อเครื่องสแกน USB / UART Barcode)
    if (Serial.available()) {
        String barcode = Serial.readStringUntil('\n');
        barcode.trim();
        if (barcode.length() >= 8) {
            Serial.printf("[BARCODE SCANNED] %s\n", barcode.c_str());
            sendBarcodeScan(barcode.c_str());
        }
    }

    // 2. รับค่าจากบัตร RFID (กรณีแตะบัตร Mifare)
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
        String cardUid = "";
        for (byte i = 0; i < mfrc522.uid.size; i++) {
            if (mfrc522.uid.uidByte[i] < 0x10) cardUid += "0";
            cardUid += String(mfrc522.uid.uidByte[i], HEX);
        }
        cardUid.toUpperCase();
        Serial.printf("[RFID SCANNED] %s\n", cardUid.c_str());
        sendBarcodeScan(cardUid.c_str());

        mfrc522.PICC_HaltA();
        mfrc522.PCD_StopCrypto1();
        delay(300);
    }
}
