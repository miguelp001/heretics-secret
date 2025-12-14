export class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;

        // Track active nodes for each scene
        this.scenes = [
            { id: 'chapter-1', nodes: [], gain: null }, // Wind
            { id: 'chapter-2', nodes: [], gain: null }, // Fire
            { id: 'chapter-3', nodes: [], gain: null }, // Heart
            { id: 'chapter-4', nodes: [], gain: null }  // Void
        ];

        this.currentSceneIndex = -1;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        this.createScene1();
        this.createScene2();
        this.createScene3();
        this.createScene4();

        this.initialized = true;
    }

    createNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }
        return buffer;
    }

    // Helper: Pink Noise
    createPinkNoise() {
        const bufferSize = 4096;
        const node = this.ctx.createScriptProcessor(bufferSize, 1, 1);
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        node.onaudioprocess = (e) => {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                output[i] *= 0.11;
                b6 = white * 0.115926;
            }
        };
        return node;
    }

    createScene1() { // Wind
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.masterGain);
        this.scenes[0].gain = gain;

        // Pink noise for wind
        const noise = this.createPinkNoise();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 1;

        // Modulate filter for "howling"
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.connect(filter);
        filter.connect(gain);
        lfo.start();

        this.scenes[0].nodes.push(noise, lfo); // noise is script processor, always running
    }

    createScene2() { // Fire / Tension
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.masterGain);
        this.scenes[1].gain = gain;

        // Low drone
        const osc = this.ctx.createOscillator();
        osc.frequency.value = 60;
        osc.type = 'triangle';
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0.1;
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start();

        // Crackling (simulated with random clicks)
        const crackleNode = this.ctx.createScriptProcessor(4096, 1, 1);
        crackleNode.onaudioprocess = (e) => {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < 4096; i++) {
                if (Math.random() > 0.999) {
                    output[i] = Math.random() * 0.5;
                } else {
                    output[i] = 0;
                }
            }
        };
        crackleNode.connect(gain);

        this.scenes[1].nodes.push(osc, crackleNode);
    }

    createScene3() { // Heart / Ritual
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.masterGain);
        this.scenes[2].gain = gain;

        // Heartbeat
        const osc = this.ctx.createOscillator();
        osc.frequency.value = 50;
        const beatGain = this.ctx.createGain();
        beatGain.gain.value = 0;
        osc.connect(beatGain);
        beatGain.connect(gain);
        osc.start();

        // Rhythmic pulse
        setInterval(() => {
            if (this.currentSceneIndex !== 2) return;
            // Lub
            beatGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.05);
            beatGain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.1, 0.05);
            // Dub
            setTimeout(() => {
                beatGain.gain.setTargetAtTime(0.6, this.ctx.currentTime, 0.05);
                beatGain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.1, 0.05);
            }, 300);
        }, 1200); // 50 BPM

        // Eerie high pitch
        const highOsc = this.ctx.createOscillator();
        highOsc.type = 'sine';
        highOsc.frequency.value = 800;
        const highGain = this.ctx.createGain();
        highGain.gain.value = 0.02;
        highOsc.connect(highGain);
        highGain.connect(gain);
        highOsc.start();

        // Tremolo for high pitch
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 5;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.01;
        lfo.connect(lfoGain);
        lfoGain.connect(highGain.gain);
        lfo.start();

        this.scenes[2].nodes.push(osc, highOsc, lfo);
    }

    createScene4() { // Void
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.masterGain);
        this.scenes[3].gain = gain;

        // Hollow wind (bandpass noise)
        const noise = this.createPinkNoise();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 600;
        filter.Q.value = 10;

        // Moving filter
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05; // Very slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        noise.connect(filter);
        filter.connect(gain);

        this.scenes[3].nodes.push(noise, lfo);
    }

    setScene(index) {
        if (index === this.currentSceneIndex) return;
        this.currentSceneIndex = index;

        // Crossfade
        this.scenes.forEach((scene, i) => {
            if (i === index) {
                // Fade In
                scene.gain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 2);
            } else {
                // Fade Out
                scene.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 2);
            }
        });
    }

    stopAll() {
        this.scenes.forEach(scene => {
            scene.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 1);
        });
    }
}
