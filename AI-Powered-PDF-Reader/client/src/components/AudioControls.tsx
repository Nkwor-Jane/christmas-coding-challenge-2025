import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

interface AudioControlsProps {
  text: string;
  onPositionChange?: (position: number) => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
//   const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // Split text into sentences
  useEffect(() => {
    if (text) {
      const sentenceArray = text
        .split(/(?<=[.!?])\s+/)
        .filter(sentence => sentence.trim().length > 0);
      setSentences(sentenceArray);
    }
  }, [text]);

  // Initialize speech synthesis
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  const speak = (startIndex: number = 0) => {
    if (!sentences.length || startIndex >= sentences.length) return;

    // Cancel any ongoing speech
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
      // Move to next sentence
      if (startIndex < sentences.length - 1) {
        speak(startIndex + 1);
      } else {
        // Finished reading all sentences
        setIsPlaying(false);
        setCurrentSentenceIndex(0);
      }
    };

  utterance.onerror = (event) => {
    if (event.error === "interrupted") {
      //Ignore Chrome's interruption error — user triggered stop/pause/restart
      return;
    }
    console.error("Speech synthesis error:", event);
    setIsPlaying(false);
  };


    utteranceRef.current = utterance;
    setTimeout(() => {
      speechSynthesisRef.current.speak(utterance);
    }, 50);
  };

  const handlePlay = () => {
    if (isPaused) {
      // Resume from where we paused
      speechSynthesisRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      // Start from current position
      speak(currentSentenceIndex);
    }
  };

  const handlePause = () => {
    if (isPlaying) {
      speechSynthesisRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    speechSynthesisRef.current.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };

  const handleSkipForward = () => {
    const nextIndex = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    setCurrentSentenceIndex(nextIndex);
    if (isPlaying) {
      speak(nextIndex);
    }
  };

  const handleSkipBack = () => {
    const prevIndex = Math.max(currentSentenceIndex - 1, 0);
    setCurrentSentenceIndex(prevIndex);
    if (isPlaying) {
      speak(prevIndex);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying) {
      // Restart with new speed
      speak(currentSentenceIndex);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 0 : newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (utteranceRef.current) {
      utteranceRef.current.volume = !isMuted ? 0 : volume;
    }
  };

  const progress = sentences.length > 0 ? (currentSentenceIndex / sentences.length) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Audio Controls</h3>
        <span className="text-sm text-gray-500">
          {currentSentenceIndex + 1} / {sentences.length} sentences
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Sentence Display */}
      <div className="bg-blue-50 rounded-lg p-4 min-h-[80px]">
        <p className="text-sm text-gray-700 leading-relaxed">
          {sentences[currentSentenceIndex] || 'No text to read...'}
        </p>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleSkipBack}
          disabled={currentSentenceIndex === 0}
          className="p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous sentence"
        >
          <SkipBack className="w-6 h-6 text-gray-700" />
        </button>

        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
            title="Play"
          >
            <Play className="w-8 h-8 text-white" fill="white" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
            title="Pause"
          >
            <Pause className="w-8 h-8 text-white" fill="white" />
          </button>
        )}

        <button
          onClick={handleSkipForward}
          disabled={currentSentenceIndex >= sentences.length - 1}
          className="p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next sentence"
        >
          <SkipForward className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Speed and Volume Controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
            <span>Speed</span>
            <span className="text-blue-600">{speed.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.5x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
            <span>Volume</span>
            <button onClick={toggleMute} className="p-1 hover:bg-gray-100 rounded">
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-600" />
              ) : (
                <Volume2 className="w-5 h-5 text-gray-600" />
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Quick Speed Buttons */}
      <div className="flex gap-2 justify-center">
        {[0.75, 1.0, 1.25, 1.5, 2.0].map((speedOption) => (
          <button
            key={speedOption}
            onClick={() => handleSpeedChange(speedOption)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              speed === speedOption
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {speedOption}x
          </button>
        ))}
      </div>

      {/* Stop Button */}
      {(isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          className="w-full py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium"
        >
          Stop Reading
        </button>
      )}
    </div>
  );
};

export default AudioControls;