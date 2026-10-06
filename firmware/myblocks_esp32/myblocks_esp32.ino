#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <driver/gpio.h>

// MyBlocks: comandos "DWRITE porta 0|1" e "AWRITE porta 0..255".
// Selecione uma placa ESP32 compatível com BLE no Arduino IDE.
static const char *SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char *RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
static const char *TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
BLECharacteristic *txCharacteristic = nullptr;
String usbLine, bleLine;
Servo *servos[GPIO_NUM_MAX] = {};
OneWire *temperatureWires[GPIO_NUM_MAX] = {};
DallasTemperature *temperatureSensors[GPIO_NUM_MAX] = {};

void detachServo(int pin) {
  if (servos[pin] && servos[pin]->attached()) servos[pin]->detach();
}

void reply(const String &message, bool fromBle) {
  if (fromBle && txCharacteristic) {
    txCharacteristic->setValue(message.c_str());
    txCharacteristic->notify();
  } else {
    Serial.println(message);
  }
}

void command(String line, bool fromBle) {
  line.trim();
  if (line == "PING") { reply("PONG", fromBle); return; }
  int pin = -1, value = -1;
  if (sscanf(line.c_str(), "TEMP %d", &pin) == 1) {
    // OneWire needs a bidirectional GPIO, so input-only pins are rejected.
    if (pin < 0 || pin >= GPIO_NUM_MAX || !GPIO_IS_VALID_OUTPUT_GPIO((gpio_num_t)pin)) {
      reply("ERR TEMPERATURE_PIN", fromBle); return;
    }
    if (!temperatureSensors[pin]) {
      temperatureWires[pin] = new OneWire(pin);
      temperatureSensors[pin] = new DallasTemperature(temperatureWires[pin]);
    }
    DallasTemperature *sensor = temperatureSensors[pin];
    sensor->begin();
    sensor->setResolution(12);
    sensor->setWaitForConversion(true);
    if (sensor->getDeviceCount() == 0) { reply("ERR DS18B20_NOT_FOUND", fromBle); return; }
    sensor->requestTemperatures();
    float temperature = sensor->getTempCByIndex(0);
    if (temperature == DEVICE_DISCONNECTED_C || !isfinite(temperature)) {
      reply("ERR DS18B20_DISCONNECTED", fromBle); return;
    }
    reply("TEMP " + String(pin) + " " + String(temperature, 4), fromBle);
    return;
  }
  if (sscanf(line.c_str(), "SERVO %d %d", &pin, &value) == 2) {
    if (pin < 0 || pin >= GPIO_NUM_MAX || !GPIO_IS_VALID_OUTPUT_GPIO((gpio_num_t)pin) || value < 0 || value > 180) {
      reply("ERR SERVO_PIN_OR_ANGLE", fromBle); return;
    }
    if (value == 0) {
      detachServo(pin);
      pinMode(pin, OUTPUT);
      digitalWrite(pin, LOW);
    } else {
      if (!servos[pin]) servos[pin] = new Servo();
      if (!servos[pin]->attached()) {
        servos[pin]->setPeriodHertz(50);
        servos[pin]->attach(pin, 500, 2400);
      }
      if (!servos[pin]->attached()) { reply("ERR SERVO_ATTACH", fromBle); return; }
      servos[pin]->write(value);
    }
    reply("OK SERVO", fromBle);
    return;
  }
  if (sscanf(line.c_str(), "AREAD %d", &pin) == 1) {
    if (pin < 0 || pin >= GPIO_NUM_MAX || !GPIO_IS_VALID_GPIO((gpio_num_t)pin)) {
      reply("ERR PIN", fromBle); return;
    }
    int reading = analogRead(pin);
    reply("AREAD " + String(pin) + " " + String(reading), fromBle);
    return;
  }
  if (sscanf(line.c_str(), "DWRITE %d %d", &pin, &value) == 2) {
    if (pin < 0 || pin >= GPIO_NUM_MAX || !GPIO_IS_VALID_OUTPUT_GPIO((gpio_num_t)pin) || (value != 0 && value != 1)) {
      reply("ERR PIN_OU_ESTADO", fromBle); return;
    }
    detachServo(pin);
    pinMode(pin, OUTPUT);
    digitalWrite(pin, value ? HIGH : LOW);
    reply("OK DWRITE", fromBle);
    return;
  }
  if (sscanf(line.c_str(), "AWRITE %d %d", &pin, &value) == 2) {
    if (pin < 0 || pin >= GPIO_NUM_MAX || !GPIO_IS_VALID_OUTPUT_GPIO((gpio_num_t)pin) || value < 0 || value > 255) {
      reply("ERR PIN_OU_VALOR", fromBle); return;
    }
    detachServo(pin);
    pinMode(pin, OUTPUT);
    analogWrite(pin, value);
    reply("OK AWRITE", fromBle);
    return;
  }
  reply("ERR COMANDO", fromBle);
}

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    String received = characteristic->getValue();
    for (unsigned int i = 0; i < received.length(); ++i) {
      char c = received[i];
      if (c == '\n') { command(bleLine, true); bleLine = ""; }
      else if (c != '\r' && bleLine.length() < 100) bleLine += c;
    }
  }
};

void setup() {
  Serial.begin(115200);
  BLEDevice::init("MyBlocks-ESP32");
  BLEServer *server = BLEDevice::createServer();
  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *rx = service->createCharacteristic(RX_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rx->setCallbacks(new RxCallbacks());
  txCharacteristic = service->createCharacteristic(TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  txCharacteristic->addDescriptor(new BLE2902());
  service->start();
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();

}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') { command(usbLine, false); usbLine = ""; }
    else if (c != '\r' && usbLine.length() < 100) usbLine += c;
  }
  delay(2);
}
