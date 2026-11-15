/**
 * Unified speech & voice facade for TRÍ AI SALES ROBOT.
 * Re-exports voiceRecognition & voiceSynthesis modules.
 */

export * from './voiceSynthesis.js';
export * from './voiceRecognition.js';
export { default as VoiceRecognizer } from './voiceRecognition.js';
export { default as VoiceSynthesis } from './voiceSynthesis.js';
