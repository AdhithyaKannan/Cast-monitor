export class AnomalyDetector {
  constructor(windowSize = 40, zThreshold = 2.5) {
    this.windowSize = windowSize;
    this.zThreshold = zThreshold;
    this.history = {};
    this.baselines = {};
    this.stdDevs = {};
  }

  _init(key) {
    if (!this.history[key]) {
      this.history[key] = [];
      this.baselines[key] = null;
      this.stdDevs[key] = null;
    }
  }

  feed(key, value) {
    this._init(key);
    this.history[key].push(value);
    if (this.history[key].length > this.windowSize) this.history[key].shift();
    if (this.history[key].length >= 5) {
      const arr = this.history[key];
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
      this.baselines[key] = mean;
      this.stdDevs[key] = std;
    }
  }

  isAnomaly(key, value) {
    this._init(key);
    if (this.baselines[key] === null) return false;
    const z = Math.abs((value - this.baselines[key]) / (this.stdDevs[key] || 0.0001));
    return z > this.zThreshold;
  }

  getConfidence(key) {
    this._init(key);
    return Math.min(100, Math.round((this.history[key].length / this.windowSize) * 100));
  }

  warmup(sensors, iterations = 20) {
    for (let i = 0; i < iterations; i++) {
      sensors.forEach((s) => {
        const noise = (Math.random() - 0.5) * s.drift;
        this.feed(s.key, s.baseVal + noise);
      });
    }
  }
}