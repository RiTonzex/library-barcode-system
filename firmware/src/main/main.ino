/**
 * ==============================================================================
 * LIBRARY ATTENDANCE SCANNER - ESP32 FIRMWARE (GM805-S + PASSIVE BUZZER + DUAL LED)
 * ==============================================================================
 * หน้าที่:
 *   - รับข้อมูลบาร์โค้ดจาก GM805-S Barcode Scanner ผ่าน UART2 (9600 baud)
 *   - ยิงข้อมูลรหัสนักศึกษาขึ้นเซิร์ฟเวอร์เพื่อถอดรหัสคณะ/สาขา และซิงก์ Google Sheets
 *   - แจ้งเตือนด้วย Passive Buzzer (ใช้ความถี่ tone()) และไฟ LED สองสี (เขียว/แดง)
 *   - มี Offline Retry Queue กรณีเน็ตหลุด (ยิงย้อนหลังทันทีเมื่อเน็ตกลับมา)
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==============================================================================
// CONFIGURATION (ปรับแก้ตามเครือข่ายของคุณ)
// ==============================================================================
const char* WIFI_SSID       = "PRAPAI2WiFi_2G";
const char* WIFI_PASSWORD   = "0874492810";

// Server API Endpoint (Render หรือ Local FastAPI)
const char* SERVER_BASE_URL = "http://192.168.1.100:8000";
const char* DEVICE_API_KEY  = "lib_esp32_secret_key_prod_998877";
const char* DEVICE_ID       = "ESP32_LIBRARY_SCANNER_01";

// ==============================================================================
// HARDWARE PIN DEFINITIONS
// ==============================================================================
// 1. GM805-S 1D/2D Barcode Scanner (HardwareSerial UART2)
#define PIN_GM805S_RX    16   // ESP32 RX2 (ต่อกับขา TXD ของ GM805-S)
#define PIN_GM805S_TX    17   // ESP32 TX2 (ต่อกับขา RXD ของ GM805-S)
#define GM805S_BAUD      9600 // ค่าเริ่มต้นจากโรงงานของ GM805-S

// 2. สถานะแจ้งเตือน (LED เขียว + LED แดง + Passive Buzzer)
#define PIN_LED_GREEN    2    // ไฟเขียว: สแกนผ่าน / เชื่อมต่อสำเร็จ (GPIO 2 หรือ Onboard LED)
#define PIN_LED_RED      15   // ไฟแดง: สแกนไม่ผ่าน / เกิดข้อผิดพลาด / รอเน็ต
#define PIN_BUZZER       4    // Passive Buzzer (ขับด้วยสัญญาณความถี่ tone())

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

// 🟢 สแกนสำเร็จ: ไฟเขียวติด + Passive Buzzer บี๊บเสียงสูงน่าฟัง (2400 Hz, 90ms)
void triggerSuccess() {
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
    isLedActive = true;
    ledOffTime = millis() + 600;

    tone(PIN_BUZZER, 2400, 90);
}

// 🔴 สแกนไม่ผ่าน / รหัสไม่พบ: ไฟแดงติด + Passive Buzzer เสียงทุ้มเตือน ติ๊ด-ติ๊ด (800 Hz สองครั้ง)
void triggerError() {
    digitalWrite(PIN_LED_RED, HIGH);
    digitalWrite(PIN_LED_GREEN, LOW);
    isLedActive = true;
    ledOffTime = millis() + 800;

    tone(PIN_BUZZER, 800, 120);
    delay(150);
    tone(PIN_BUZZER, 800, 120);
}

void connectWifi() {
    if (WiFi.status() == WL_CONNECTED) return;
    Serial.printf("[WIFI] กำลังเชื่อมต่อ %s...", WIFI_SSID);
    digitalWrite(PIN_LED_RED, HIGH);
    digitalWrite(PIN_LED_GREEN, LOW);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        // กะพริบไฟแดงขณะกำลังต่อเน็ต
        digitalWrite(PIN_LED_RED, !digitalRead(PIN_LED_RED));
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        digitalWrite(PIN_LED_RED, LOW);
        digitalWrite(PIN_LED_GREEN, HIGH);
        Serial.printf("\n[WIFI] เชื่อมต่อสำเร็จ! IP: %s\n", WiFi.localIP().toString().c_str());

        // เสียง Boot Melody สั้นๆ ต้อนรับ
        tone(PIN_BUZZER, 1800, 80);
        delay(100);
        tone(PIN_BUZZER, 2400, 120);
        delay(300);
        digitalWrite(PIN_LED_GREEN, LOW);
    } else {
        digitalWrite(PIN_LED_RED, HIGH);
        Serial.println("\n[WIFI] ไม่สามารถเชื่อมต่อเน็ตได้ (เข้าสู่โหมดออฟไลน์)");
    }
}

bool sendBarcodeScan(const char* barcode) {
    if (WiFi.status() != WL_CONNECTED) {
        enqueueOfflineScan(barcode);
        triggerSuccess(); // แม้เน็ตหลุด ก็แจ้งเตือนว่าบอร์ดรับรหัสแล้วลงคิว
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
    String response = http.getString();
    http.end();

    if (httpCode == 200) {
        Serial.printf("[SCAN] บันทึกสำเร็จ: %s\n", barcode);
        triggerSuccess();
        return true;
    } else {
        Serial.printf("[ERROR] สแกนไม่สำเร็จ (HTTP %d, ตอบกลับ: %s)\n", httpCode, response.c_str());
        if (httpCode >= 500 || httpCode == -1) {
            // ปัญหาเซิร์ฟเวอร์ล่ม/เน็ตหลุด ให้เข้าคิวออฟไลน์
            enqueueOfflineScan(barcode);
        }
        triggerError();
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
    Serial.begin(115200); // Debug USB Serial Monitor
    delay(500);
    Serial.println("\n--- ระบบสแกนสถิติห้องสมุด (ESP32 + GM805-S) ---");

    // 1. ตั้งค่า GM805-S ผ่าน HardwareSerial (UART2)
    Serial2.begin(GM805S_BAUD, SERIAL_8N1, PIN_GM805S_RX, PIN_GM805S_TX);
    Serial2.setTimeout(50); // ตอบสนองเร็วทันใจ
    Serial.printf("[HARDWARE] GM805-S พร้อมใช้งานที่ %d baud (RX: GPIO %d, TX: GPIO %d)\n", GM805S_BAUD, PIN_GM805S_RX, PIN_GM805S_TX);

    // 2. ตั้งค่าไฟ LED และ Passive Buzzer
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);

    // 🔊 [TEST ROUTINE] ทดสอบเสียง Buzzer และไฟ LED ทันทีตอนบูต
    Serial.println("[TEST] กำลังทดสอบเสียง Passive Buzzer (Success Tone 2400Hz)...");
    triggerSuccess();
    delay(1000);

    Serial.println("[TEST] กำลังทดสอบเสียง Passive Buzzer (Error Tone 800Hz x2)...");
    triggerError();
    delay(1000);
    Serial.println("[TEST] ทดสอบเสียงเรียบร้อยแล้ว!");
    Serial.println("👉 คุณสามารถพิมพ์ตัวอักษร 't' ใน Serial Monitor แล้วกด Enter เพื่อเทสเสียงได้ตลอดเวลา");

    // 3. เชื่อมต่อ Wi-Fi
    connectWifi();
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

    // ปิดไฟ LED อัตโนมัติเมื่อครบเวลา
    if (isLedActive && currentMillis >= ledOffTime) {
        digitalWrite(PIN_LED_GREEN, LOW);
        digitalWrite(PIN_LED_RED, LOW);
        isLedActive = false;
    }

    // 1. รับค่าจากเครื่องสแกนบาร์โค้ด GM805-S ผ่าน HardwareSerial (Serial2)
    if (Serial2.available()) {
        String barcode = Serial2.readStringUntil('\r');
        barcode.trim();
        while (barcode.length() > 0 && (barcode[0] == '\n' || barcode[0] == '\r')) {
            barcode.remove(0, 1);
        }
        if (barcode.length() >= 8) {
            Serial.printf("[GM805-S SCANNED] รหัส: %s\n", barcode.c_str());
            sendBarcodeScan(barcode.c_str());
        }
    }

    // 2. รับค่าจาก Serial Monitor (กด 't' เพื่อเทสเสียง หรือพิมพ์รหัส 10 หลักเพื่อทดสอบส่ง)
    if (Serial.available()) {
        String input = Serial.readStringUntil('\n');
        input.trim();
        if (input.equalsIgnoreCase("t") || input.equalsIgnoreCase("test")) {
            Serial.println("[TEST MANUAL] ทดสอบเสียง Success Tone (ไฟเขียว)...");
            triggerSuccess();
            delay(800);
            Serial.println("[TEST MANUAL] ทดสอบเสียง Error Tone (ไฟแดง)...");
            triggerError();
        } else if (input.length() >= 8) {
            Serial.printf("[DEBUG SERIAL SCANNED] รหัส: %s\n", input.c_str());
            sendBarcodeScan(input.c_str());
        }
    }
}
