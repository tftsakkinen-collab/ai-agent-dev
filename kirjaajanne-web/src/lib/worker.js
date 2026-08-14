import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we are running in browser via CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineFactory {
    static task = 'automatic-speech-recognition';
    // Using a tiny, quantized multilingual whisper model capable of Finnish
    static model = 'Xenova/whisper-tiny';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // We only expect one type of message containing audio data for now
    const audioData = event.data.audio;

    try {
        // Retrieve the pipeline. Send progress updates back to the main thread.
        const transcriber = await PipelineFactory.getInstance(x => {
            self.postMessage({ status: 'progress', data: x });
        });

        self.postMessage({ status: 'processing', stage: 'asr' });

        // Run the model on the audio data. Force output language to Finnish.
        const output = await transcriber(audioData, {
            language: 'finnish',
            task: 'transcribe',
            chunk_length_s: 30, // Required for long audio
            stride_length_s: 5,
        });

        const rawText = output.text;

        // Stage 1 Complete: Raw ASR
        self.postMessage({
            status: 'asr_complete',
            text: rawText,
        });

    } catch (error) {
        self.postMessage({ status: 'error', error: error.message });
    }
});
