import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Mic } from 'lucide-react';

interface AudioControlsProps {
  text: string;
  onPositionChange?: (position: number) => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  
  // ElevenLabs integration
  const [useElevenLabs, setUseElevenLabs] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Bill');
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ElevenLabs voices
  const elevenLabsVoices = [
    { id: 'Bill', name: 'Bill (Male)' },
    { id: 'Lily', name: 'Lily (Female)' },
    { id: 'Daniel', name: 'Daniel (Male)' },
    { id: 'Brian', name: 'Brian (Male)' },
    { id: 'Chris', name: 'Chris (Male)' },
    { id: 'Eric', name: 'Eric (Male)' },
    { id: 'Jessica', name: 'Jessica (Female)' },
    { id: 'Will', name: 'Will (Male)' },
    { id: 'George', name: 'George (Male)' },
    { id: 'Sarah', name: 'Sarah (Female)' },
  ];

  // Split text into sentences
  useEffect(() => {
    if (text) {
      const sentenceArray = text
        .split(/(?<=[.!?])\s+/)
        .filter(sentence => sentence.trim().length > 0);
      setSentences(sentenceArray);
    }
  }, [text]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Generate audio using ElevenLabs
  const generateElevenLabsAudio = async (text: string): Promise<string | null> => {
    try {
      setIsLoadingAudio(true);
      
      const response = await fetch('http://localhost:8000/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: selectedVoice,
          provider: 'elevenlabs',
          speed: speed
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();
      
      if (data.success) {
        return `data:audio/mp3;base64,${data.audio_data}`;
      }
      
      return null;
    } catch (error) {
      console.error('ElevenLabs error:', error);
      return null;
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Play with ElevenLabs
  const playWithElevenLabs = async (startIndex: number = 0) => {
    if (!sentences.length || startIndex >= sentences.length) return;

    setIsPlaying(true);
    setCurrentSentenceIndex(startIndex);

    // Generate audio for current sentence
    const audioUrl = await generateElevenLabsAudio(sentences[startIndex]);
    
    if (!audioUrl) {
      console.error('Failed to generate audio');
      setIsPlaying(false);
      return;
    }

    // Play the audio
    const audio = new Audio(audioUrl);
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    audio.onended = () => {
      // Move to next sentence
      if (startIndex < sentences.length - 1) {
        playWithElevenLabs(startIndex + 1);
      } else {
        setIsPlaying(false);
        setCurrentSentenceIndex(0);
      }
    };

    audio.onerror = () => {
      console.error('Audio playback error');
      setIsPlaying(false);
    };

    audio.play();
  };

  // Play with browser TTS
  const speak = (startIndex: number = 0) => {
    if (!sentences.length || startIndex >= sentences.length) return;

    speechSynthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(sentences[startIndex]);
    utterance.rate = speed;
    utterance.volume = isMuted ? 0 : volume;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentSentenceIndex(startIndex);
    };

    utterance.onend = () => {
      if (startIndex < sentences.length - 1) {
        speak(startIndex + 1);
      } else {
        setIsPlaying(false);
        setCurrentSentenceIndex(0);
      }
    };

    utterance.onerror = (event) => {
      if (event.error === "interrupted") return;
      console.error("Speech synthesis error:", event);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    setTimeout(() => {
      speechSynthesisRef.current.speak(utterance);
    }, 50);
  };

  const handlePlay = () => {
    if (isPaused && !useElevenLabs) {
      speechSynthesisRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      if (useElevenLabs) {
        playWithElevenLabs(currentSentenceIndex);
      } else {
        speak(currentSentenceIndex);
      }
    }
  };

  const handlePause = () => {
    if (isPlaying) {
      if (useElevenLabs) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        speechSynthesisRef.current.pause();
        setIsPaused(true);
        setIsPlaying(false);
      }
    }
  };

  const handleStop = () => {
    if (useElevenLabs) {
      audioRef.current?.pause();
      audioRef.current = null;
    } else {
      speechSynthesisRef.current.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };

  const handleSkipForward = () => {
    const nextIndex = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    setCurrentSentenceIndex(nextIndex);
    if (isPlaying) {
      if (useElevenLabs) {
        playWithElevenLabs(nextIndex);
      } else {
        speak(nextIndex);
      }
    }
  };

  const handleSkipBack = () => {
    const prevIndex = Math.max(currentSentenceIndex - 1, 0);
    setCurrentSentenceIndex(prevIndex);
    if (isPlaying) {
      if (useElevenLabs) {
        playWithElevenLabs(prevIndex);
      } else {
        speak(prevIndex);
      }
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying && !useElevenLabs) {
      speak(currentSentenceIndex);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 0 : newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = !isMuted ? 0 : volume;
    }
    if (utteranceRef.current) {
      utteranceRef.current.volume = !isMuted ? 0 : volume;
    }
  };

  const progress = sentences.length > 0 ? (currentSentenceIndex / sentences.length) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Audio Controls</h3>
        <span className="text-sm text-gray-500 dark:text-gray-300">
          {currentSentenceIndex + 1} / {sentences.length} sentences
        </span>
      </div>

      {/* Voice Provider Toggle */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-200 rounded-lg">
        <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <div className="flex-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useElevenLabs}
              onChange={(e) => setUseElevenLabs(e.target.checked)}
              className="w-4 h-4 text-blue-600 dark:text-blue-100 rounded focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-700">
              Use Premium Voice (ElevenLabs)
            </span>
          </label>
        </div>
      </div>

      {/* Voice Selection (ElevenLabs Voices) */}
      {useElevenLabs && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-100">Select Voice</label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full p-2 border border-gray-300 bg-gray-400 dark:border-gray-600 dark:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {elevenLabsVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
        <div
          className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Sentence Display */}
      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 min-h-[80px]">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {sentences[currentSentenceIndex] || 'No text to read...'}
        </p>
      </div>

      {/* Loading Indicator */}
      {isLoadingAudio && (
        <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="text-sm">Generating audio...</span>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleSkipBack}
          disabled={currentSentenceIndex === 0 || isLoadingAudio}
          className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous sentence"
        >
          <SkipBack className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        {!isPlaying ? (
          <button
            onClick={handlePlay}
            disabled={isLoadingAudio}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors disabled:opacity-50"
            title="Play"
          >
            <Play className="w-8 h-8 text-white dark:text-gray-300" fill="white" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-200 dark:hover:bg-blue-300 transition-colors"
            title="Pause"
          >
            <Pause className="w-8 h-8 text-white dark:text-gray-300" fill="white" />
          </button>
        )}

        <button
          onClick={handleSkipForward}
          disabled={currentSentenceIndex >= sentences.length - 1 || isLoadingAudio}
          className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next sentence"
        >
          <SkipForward className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Speed and Volume Controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700  dark:text-gray-200 flex items-center justify-between">
            <span>Speed</span>
            <span className="text-blue-600 dark:text-blue-100">{speed.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            disabled={useElevenLabs}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0.5x</span>
            <span>2.0x</span>
          </div>
          {useElevenLabs && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Speed control not available with ElevenLabs</p>
          )}
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-between">
            <span>Volume</span>
            <button onClick={toggleMute} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-300 rounded">
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            disabled={isMuted}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Browser TTS only */}
      {!useElevenLabs && (
        <div className="flex gap-2 justify-center">
          {[0.75, 1.0, 1.25, 1.5, 2.0].map((speedOption) => (
            <button
              key={speedOption}
              onClick={() => handleSpeedChange(speedOption)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                speed === speedOption
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {speedOption}x
            </button>
          ))}
        </div>
      )}

      {/* Stop Button */}
      {(isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          className="w-full py-2 bg-red-100 dark:bg-red-500 text-red-600 dark:text-white rounded-lg hover:bg-red-200 dark:hover:bg-red-400 transition-colors font-medium"
        >
          Stop Reading
        </button>
      )}
    </div>
  );
};

export default AudioControls;