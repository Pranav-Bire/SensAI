'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mic, Video, VideoOff, MicOff, Play, StopCircle, Upload, FileText, Volume, VolumeX, Minimize, BarChart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

// Toast component with proper dismiss button
const ToastWithDismiss = ({ title, description, onDismiss }) => (
  <div className="bg-background border rounded-lg shadow-lg p-4 mb-2 flex items-start">
    <div className="flex-1">
      {title && <h4 className="font-medium text-sm">{title}</h4>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    <Button variant="ghost" size="sm" onClick={onDismiss} className="h-5 w-5 p-0">
      <X className="h-3 w-3" />
    </Button>
  </div>
);

const ResumeInterview = ({ userResume }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [interviewReport, setInterviewReport] = useState(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [resumeText, setResumeText] = useState(userResume || '');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploadMethod, setResumeUploadMethod] = useState('text');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [speechSynthesisVoice, setSpeechSynthesisVoice] = useState(null);
  const [industry, setIndustry] = useState('Technology');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [allAnalyses, setAllAnalyses] = useState([]);
  const [industries, setIndustries] = useState([
    'Technology', 'Finance', 'Healthcare', 'Marketing', 
    'Education', 'Manufacturing', 'Retail', 'Consulting'
  ]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [resumeAnalyzed, setResumeAnalyzed] = useState(false);
  const [resumeQuestions, setResumeQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [interviewState, setInterviewState] = useState("idle");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  const videoRef = useRef(null);
  const miniVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const toastIdRef = useRef(0);
  const recognitionRef = useRef(null);
  const { toast } = useToast();

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Get available voices and select a suitable one
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Prefer a female english voice if available
          const preferredVoice = voices.find(voice => 
            voice.lang.includes('en') && voice.name.includes('Female')
          ) || voices.find(voice => 
            voice.lang.includes('en')
          ) || voices[0];
          
          setSpeechSynthesisVoice(preferredVoice);
          console.log('Selected voice:', preferredVoice.name);
        }
      };

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = setVoice;
      }
      
      setVoice(); // For browsers that load voices synchronously
    }
  }, []);

  // Check if Web Speech API is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setRecognitionSupported(true);
    }
  }, []);

  // Initialize speech recognition for live transcription
  const initSpeechRecognition = () => {
    if (!recognitionSupported) return;

    // If recognition is already initialized, don't create a new instance
    if (recognitionRef.current) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + ' ';
        } else {
          transcript += event.results[i][0].transcript;
        }
      }
      setLiveTranscript(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        showToast(
          'Microphone Access Denied',
          'Please enable microphone access to use live transcription.',
          'destructive'
        );
      }
      // Don't keep trying to restart if there's an error
      setIsTranscribing(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      // Only auto-restart if we're still in recording mode and no error occurred
      if (isTranscribing) {
        try {
          setTimeout(() => {
            if (isTranscribing && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 1000);
        } catch (error) {
          console.error('Error restarting recognition:', error);
          setIsTranscribing(false);
        }
      }
    };

    recognitionRef.current = recognition;
  };

  // Speak text using the browser's speech synthesis
  const speakText = (text) => {
    if (!isAudioEnabled) {
      startRecording();
      return;
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance
        if (speechSynthesisVoice) {
          utterance.voice = speechSynthesisVoice;
        }
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Store reference
        speechSynthesisRef.current = utterance;
        
        // Set up handlers
        utterance.onstart = () => {
          console.log('Started speaking');
        };
        
        utterance.onend = () => {
          console.log('Finished speaking');
          if (isStarted && !isRecording) {
            startRecording();
          }
        };
        
        utterance.onerror = () => {
          console.log('Speech synthesis error - starting recording');
          if (isStarted && !isRecording) {
            startRecording();
          }
        };
        
        // Add a small delay before speaking
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 100);
      } catch (error) {
        console.log('Speech synthesis error:', error);
        startRecording();
      }
    } else {
      startRecording();
    }
  };

  // Handle the mini video element when interview is ongoing
  useEffect(() => {
    if (isStarted && mediaStream && miniVideoRef.current && isVideoMinimized) {
      miniVideoRef.current.srcObject = mediaStream;
    }
  }, [isStarted, mediaStream, isVideoMinimized]);

  // Speak current question when it changes
  useEffect(() => {
    if (currentQuestion && isStarted) {
      speakText(currentQuestion);
    }
  }, [currentQuestion, isStarted]);

  // Initialize media devices
  const initializeMedia = async () => {
    try {
      if (mediaStream) {
        // Clean up existing stream if any
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      // Request media with specific audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      // Store the stream
      setMediaStream(stream);
      
      // Set up video elements
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      if (miniVideoRef.current && isVideoMinimized) {
        miniVideoRef.current.srcObject = stream;
      }
      
      setIsCameraEnabled(true);
      setIsMicEnabled(true);

      // Test MediaRecorder
      try {
        const testRecorder = new MediaRecorder(stream);
        testRecorder.stop();
      } catch (error) {
        console.error('MediaRecorder test failed:', error);
        throw new Error('Your browser does not support audio recording');
      }
      
      showToast(
        'Media Access Granted',
        'Camera and microphone are now active.'
      );

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      showToast(
        'Error',
        'Unable to access camera or microphone. Please check permissions.',
        'destructive'
      );
      throw error;
    }
  };

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'application/pdf' && 
        !file.type.includes('document') && 
        !file.type.includes('text/plain')) {
      showToast(
        'Invalid file type',
        'Please upload a PDF, Word document, or text file.',
        'destructive'
      );
      return;
    }

    setResumeFile(file);
    setIsLoading(true);

    try {
      // Create formData and upload the file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/resume/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to extract text from resume');

      const data = await response.json();
      setResumeText(data.text);
    } catch (error) {
      console.error('Error extracting text from resume:', error);
      showToast(
        'Error',
        'Failed to extract text from your resume. Please try pasting the text manually.',
        'destructive'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Upload resume file for interview
  const uploadResumeForInterview = async () => {
    if (!resumeFile) {
      showToast(
        'No File Selected',
        'Please select a resume file first.',
        'destructive'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Create formData for resume upload
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('industry', industry);

      const response = await fetch('/api/resume-interview/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process resume');
      }

      const data = await response.json();
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No interview questions were generated from your resume');
      }
      
      // Save resume text and questions from the analysis
      setResumeText(data.resumeText || '');
      setInterviewQuestions(data.questions || []);
      
      showToast(
        'Resume Analyzed',
        `Successfully generated ${data.questions.length} personalized interview questions.`
      );
      
      // Display first question
      if (data.questions && data.questions.length > 0) {
        setCurrentQuestion(data.questions[0]);
      }
    } catch (error) {
      console.error('Resume upload error:', error);
      showToast(
        'Error',
        error.message || 'Failed to process your resume. Please try again.',
        'destructive'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Start the interview
  const startInterview = async () => {
    setError("");
    setStatusMessage("");
    setIsLoading(true);
    
    try {
      // Clear previous state
      setInterviewReport(null);
      setCurrentAnalysis(null);
      setAnswers([]);
      setQuestions([]);
      setAudioTranscript('');
      setAllAnalyses([]);
      setCurrentQuestionIndex(0);
      setCurrentQuestion(null);
      setSessionId(null);
      setHasAnswered(false);
      setShowNextButton(false);
      
      // Ensure we have resume text
      if (!resumeText && !resumeFile) {
        throw new Error('Please provide your resume to start the interview');
      }
      
      // Initialize media if not already done
      if (!isCameraEnabled || !isMicEnabled) {
        await initializeMedia();
      }
      
      // If we have a file but no text yet, upload it first
      if (resumeFile && !resumeText) {
        await uploadResumeForInterview();
      }
      
      // Start the interview with the resume text
      console.log('Starting interview with resume text length:', resumeText.length);
      
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeText: resumeText,
          industry: industry
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start interview');
      }
      
      const data = await response.json();
      console.log('Interview started successfully, session ID:', data.sessionId);
      
      // Set the first question and session ID
      if (data.question && data.sessionId) {
        setCurrentQuestion(data.question);
        setQuestions([data.question]);
        setSessionId(data.sessionId);
        setIsStarted(true);
        
        // Speak the first question if audio is enabled
        if (isAudioEnabled) {
          setTimeout(() => {
            speakText(data.question);
          }, 500);
        }
        
        showToast(
          'Interview Started',
          'Answer the questions by clicking the Record button. You can re-record if needed.'
        );
      } else {
        throw new Error('No question received from the server');
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      setError(error.message || 'Failed to start the interview');
      showToast(
        'Error',
        error.message || 'Failed to start the interview. Please try again.',
        'destructive'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Check API config (development mode only)
  const checkApiConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/config');
      if (!response.ok) {
        throw new Error('Failed to check API configuration');
      }
      
      const data = await response.json();
      console.log('API Config:', data);
      
      showToast(
        'API Configuration',
        `Gemini API: ${data.api_status.gemini}, Environment: ${data.config.environment}`
      );
    } catch (error) {
      console.error('Config check error:', error);
      showToast(
        'Error',
        'Failed to check API configuration',
        'destructive'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle text-to-speech
  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    
    if (isAudioEnabled && speechSynthesisRef.current) {
      // Stop current speech if turning off
      window.speechSynthesis?.cancel();
    } else if (!isAudioEnabled && currentQuestion) {
      // Resume speech if turning on
      speakText(currentQuestion);
    }
    
    showToast(
      isAudioEnabled ? 'Voice Disabled' : 'Voice Enabled',
      isAudioEnabled 
        ? 'Text-to-speech is now disabled.' 
        : 'Questions will now be read aloud.'
    );
  };

  // Toggle video minimization
  const toggleVideoSize = () => {
    setIsVideoMinimized(!isVideoMinimized);
  };

  // Start/stop live transcription
  const toggleLiveTranscription = (start = true) => {
    if (!recognitionSupported) return;
    
    try {
      if (start) {
        if (!recognitionRef.current) {
          initSpeechRecognition();
        }
        
        if (!isTranscribing) {
          recognitionRef.current.start();
          setIsTranscribing(true);
          console.log('Live transcription started');
        }
      } else {
        if (recognitionRef.current && isTranscribing) {
          recognitionRef.current.stop();
          setIsTranscribing(false);
          console.log('Live transcription stopped');
        }
      }
    } catch (error) {
      console.error('Error in toggleLiveTranscription:', error);
      // Reset state if there's an error
      setIsTranscribing(false);
    }
  };

  // Ensure camera is always visible once enabled
  useEffect(() => {
    if (mediaStream && isCameraEnabled) {
      // Make sure video is showing in both main and mini views
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      if (miniVideoRef.current) {
        miniVideoRef.current.srcObject = mediaStream;
      }
    }
  }, [mediaStream, isCameraEnabled, isVideoMinimized]);

  // Always show mini video once interview starts
  useEffect(() => {
    if (isStarted && isCameraEnabled && !isVideoMinimized) {
      setIsVideoMinimized(true);
    }
  }, [isStarted, isCameraEnabled]);

  // Start recording process
  const startRecordingProcess = async () => {
    try {
      // Check if we need to initialize media
      if (!mediaStream || !mediaStream.active) {
        await initializeMedia();
      }

      // Verify audio track is available and enabled
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        throw new Error('Microphone is not available');
      }

      // Create new MediaRecorder with basic settings
      const recorder = new MediaRecorder(mediaStream);
      
      // Clear previous chunks
      chunksRef.current = [];

      // Set up event handlers
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setIsRecording(false);
        showToast(
          'Recording Error',
          'An error occurred while recording',
          'destructive'
        );
      };

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processAnswer(audioBlob);
          chunksRef.current = [];
        } catch (error) {
          console.error('Error processing recording:', error);
          showToast(
            'Error',
            'Failed to process recording',
            'destructive'
          );
        }
      };

      // Store the recorder reference
      mediaRecorderRef.current = recorder;

      // Start recording
      recorder.start(1000); // Get data every second
      setIsRecording(true);

      // Start live transcription
      setTimeout(() => {
        toggleLiveTranscription(true);
      }, 300);

    } catch (error) {
      console.error('Recording error:', error);
      showToast(
        'Error',
        error.message || 'Failed to start recording',
        'destructive'
      );
    }
  };

  // Update startRecording to handle the process better
  const startRecording = async () => {
    if (isRecording) return;

    try {
      // Stop any ongoing speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Stop any existing transcription
      if (recognitionRef.current && isTranscribing) {
        recognitionRef.current.stop();
        setIsTranscribing(false);
      }

      // Start recording after a short delay
      await startRecordingProcess();
    } catch (error) {
      console.error('Error in startRecording:', error);
      showToast(
        'Error',
        'Failed to start recording. Please try again.',
        'destructive'
      );
    }
  };

  // Update stopRecording to also stop live transcription
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop live transcription but keep the final transcript
      toggleLiveTranscription(false);
      
      showToast(
        'Recording Stopped',
        'Processing your answer...'
      );
    }
  };

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          if (isTranscribing) {
            recognitionRef.current.stop();
          }
        } catch (error) {
          console.error('Error stopping recognition on unmount:', error);
        }
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream, isTranscribing]);

  // Process the answer and get next question
  const processAnswer = async (audioBlob) => {
    setIsLoading(true);
    setCurrentAnalysis(null);
    
    const currentTranscriptValue = liveTranscript;
    setLiveTranscript('');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      // Make sure to include the transcript
      if (currentTranscriptValue) {
        formData.append('liveTranscript', currentTranscriptValue);
      } else {
        // If no transcript, add a placeholder
        formData.append('liveTranscript', 'No transcript available');
      }

      // Always include sessionId
      if (sessionId) {
        formData.append('sessionId', sessionId);
      } else {
        throw new Error('No session ID available');
      }

      console.log(`Submitting answer for question ${currentQuestionIndex + 1}`);
      
      const response = await fetch('/api/interview/process-answer', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process answer');
      }

      const data = await response.json();
      
      // Log successful answer processing
      console.log(`Answer processed successfully for question ${currentQuestionIndex + 1}`);
      
      // Always use the transcript from the response or the current one
      const finalTranscript = data.transcription || currentTranscriptValue || "No transcription available";
      
      // Store the answer locally even if already stored on server
      setAnswers(prev => [...prev, finalTranscript]); 
      setAudioTranscript(finalTranscript);
      
      // Store the analysis if available
      if (data.analysis) {
        setCurrentAnalysis(data.analysis);
        setAllAnalyses(prev => [...prev, {
          question: currentQuestion,
          answer: finalTranscript,
          analysis: data.analysis
        }]);
      }
      
      if (data.isComplete) {
        // Interview is complete, show the report
        setInterviewReport(data.report);
        setIsStarted(false);
        
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        setIsCameraEnabled(false);
        setIsMicEnabled(false);
        
        showToast(
          'Interview Complete',
          'Your interview has been completed successfully. View your report below.'
        );
      } else {
        // Store next question but don't display it yet
        const nextQuestion = data.nextQuestion;
        console.log(`Received next question: ${nextQuestion}`);
        setQuestions(prev => [...prev, nextQuestion]);
        setShowNextButton(true);
      }

      setHasAnswered(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing answer:', error);
      setIsLoading(false);
      showToast(
        'Error',
        error.message || 'Failed to process your answer. Please try again.',
        'destructive'
      );
    }
  };

  // Handle next question with proper state updates
  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    console.log(`Moving to question ${nextIndex + 1}`);
    
    // Make sure we have the question at this index
    if (questions[nextIndex]) {
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setHasAnswered(false);
      setShowNextButton(false);
      setCurrentAnalysis(null);
      setLiveTranscript('');
      
      // Speak the new question if audio is enabled
      if (isAudioEnabled) {
        setTimeout(() => {
          speakText(questions[nextIndex]);
        }, 500);
      }
    } else {
      console.error(`Question at index ${nextIndex} is not available`);
      showToast(
        'Error',
        'The next question is not available. Please try again.',
        'destructive'
      );
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // Toggle camera
  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraEnabled(!isCameraEnabled);
        
        showToast(
          videoTrack.enabled ? 'Camera Enabled' : 'Camera Disabled',
          videoTrack.enabled 
            ? 'Your camera is now active.' 
            : 'Your camera has been turned off.'
        );
      }
    }
  };

  // Toggle mic
  const toggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(!isMicEnabled);
        
        showToast(
          audioTrack.enabled ? 'Microphone Enabled' : 'Microphone Muted',
          audioTrack.enabled 
            ? 'Your microphone is now active.' 
            : 'Your microphone has been muted.'
        );
      }
    }
  };

  // Custom toast function
  const showToast = (title, description, variant = 'default') => {
    const id = toastIdRef.current++;
    setToasts(prev => [...prev, { id, title, description, variant }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 5000);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Render Analysis Component
  const renderAnalysis = (analysis) => {
    if (!analysis) return null;
    
    return (
      <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <h4 className="font-medium mb-3 flex items-center">
          <BarChart className="h-4 w-4 mr-2" />
          Answer Analysis
        </h4>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Confidence</span>
              <span>{analysis.confidence}/10</span>
            </div>
            <Progress value={analysis.confidence * 10} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Technical Accuracy</span>
              <span>{analysis.accuracy}/10</span>
            </div>
            <Progress value={analysis.accuracy * 10} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Communication Clarity</span>
              <span>{analysis.clarity}/10</span>
            </div>
            <Progress value={analysis.clarity * 10} className="h-2" />
          </div>
          
          <div className="pt-2">
            <p className="text-sm"><span className="font-medium">Strength:</span> {analysis.strength}</p>
            <p className="text-sm mt-1"><span className="font-medium">Improvement:</span> {analysis.improvement}</p>
          </div>
        </div>
      </div>
    );
  };

  // Add session state to track previous questions
  const [session, updateSession] = useState({
    interviewQuestions: []
  });

  // Add function to end the interview and release resources
  const endInterview = () => {
    // Stop all media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop speech recognition
    if (recognitionRef.current && isTranscribing) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    
    // Stop speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Reset states
    setIsCameraEnabled(false);
    setIsMicEnabled(false);
    setIsTranscribing(false);
    setIsRecording(false);
    setIsStarted(false);
    
    // Show toast notification
    showToast(
      'Interview Ended',
      'Camera and microphone have been turned off.'
    );
  };

  return (
    <>
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(t => (
          <ToastWithDismiss 
            key={t.id}
            title={t.title}
            description={t.description}
            onDismiss={() => dismissToast(t.id)}
          />
        ))}
      </div>
      
      {/* Always show camera when enabled */}
      {isCameraEnabled && mediaStream && (isVideoMinimized || isStarted) && (
        <div className="fixed bottom-4 right-4 z-50 w-64 h-48 bg-muted rounded-lg overflow-hidden shadow-lg border border-primary">
          <video
            ref={miniVideoRef}
            autoPlay
            playsInline
            muted={!isRecording} // Only mute when not recording
            className="w-full h-full object-cover"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsVideoMinimized(!isVideoMinimized)}
            className="absolute top-2 right-2"
          >
            <Minimize className="h-3 w-3" />
          </Button>
        </div>
      )}
    
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI Interview Practice</CardTitle>
          <CardDescription>
            Practice your interview skills with AI-generated questions based on your resume
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isStarted && !interviewReport && (
            <div className="space-y-4">
              {/* Resume Upload Section */}
              <div className="space-y-4 border p-4 rounded-lg">
                <h3 className="font-medium text-lg">Upload Your Resume</h3>
                <p className="text-sm text-muted-foreground">
                  Please provide your resume so the AI can generate relevant interview questions based on your experience.
                </p>
                
                <div className="space-y-4 mb-4">
                  <label className="block text-sm font-medium">
                    Select Industry
                  </label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Tabs defaultValue="text" onValueChange={setResumeUploadMethod}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">Paste Text</TabsTrigger>
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text" className="space-y-4 mt-4">
                    <Textarea
                      placeholder="Paste your resume text here..."
                      className="min-h-[200px]"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                  </TabsContent>
                  
                  <TabsContent value="file" className="space-y-4 mt-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Select Resume File
                          </>
                        )}
                      </Button>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Supports PDF, Word, and text files
                      </p>
                      {resumeFile && (
                        <div className="mt-4 flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{resumeFile.name}</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={initializeMedia}
                  disabled={isCameraEnabled && isMicEnabled}
                >
                  Enable Camera & Mic
                </Button>
                {(isCameraEnabled || isMicEnabled) && (
                  <Button
                    variant="outline"
                    onClick={toggleCamera}
                  >
                    {isCameraEnabled ? <Video className="h-4 w-4 mr-2" /> : <VideoOff className="h-4 w-4 mr-2" />}
                    {isCameraEnabled ? 'Disable Camera' : 'Enable Camera'}
                  </Button>
                )}
                {(isCameraEnabled || isMicEnabled) && (
                  <Button
                    variant="outline"
                    onClick={toggleMic}
                  >
                    {isMicEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
                    {isMicEnabled ? 'Disable Mic' : 'Enable Mic'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? <Volume className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                  {isAudioEnabled ? 'Disable Voice' : 'Enable Voice'}
                </Button>
              </div>
              
              {/* Only show main video when not minimized */}
              {!isVideoMinimized && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex justify-center">
                <Button
                  onClick={startInterview}
                  disabled={!isCameraEnabled || !isMicEnabled || isLoading || !resumeText.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Interview...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Interview
                    </>
                  )}
                </Button>
                
                {/* Debug button only shown in development mode */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    variant="outline"
                    onClick={checkApiConfig}
                    className="ml-2"
                    disabled={isLoading}
                  >
                    Debug API
                  </Button>
                )}
              </div>
            </div>
          )}

          {isStarted && currentQuestion && (
            <div className="space-y-4">
              {/* Main video only when not minimized - but we prefer the mini view during interview */}
              {!isVideoMinimized && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-medium mb-2">Question {currentQuestionIndex + 1}/7:</h3>
                <p className="text-lg whitespace-pre-wrap">{currentQuestion}</p>
              </div>
              
              {/* Live transcription display */}
              <div className="p-4 bg-secondary/10 rounded-lg min-h-[100px] relative">
                <h4 className="font-medium mb-2">
                  {isRecording ? 'Live Transcription:' : 'Start recording to answer'}
                </h4>
                {isRecording ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {liveTranscript || 'Listening...'}
                  </p>
                ) : hasAnswered ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {audioTranscript || 'No transcription available'}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Click the record button when ready to answer</p>
                )}
              </div>
              
              {/* Recording controls */}
              <div className="flex justify-center gap-4">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading || (hasAnswered && !showNextButton)}
                  variant={isRecording ? "destructive" : "default"}
                >
                  {isRecording ? (
                    <>
                      <StopCircle className="mr-2 h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      {hasAnswered ? 'Record Again' : 'Start Recording'}
                    </>
                  )}
                </Button>

                {showNextButton && (
                  <Button onClick={handleNextQuestion}>
                    Next Question
                  </Button>
                )}
              </div>
              
              {/* Analysis display */}
              {currentAnalysis && hasAnswered && renderAnalysis(currentAnalysis)}
            </div>
          )}

          {interviewReport && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Interview Report</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Overall Performance</h4>
                  <p className="text-muted-foreground">{interviewReport.overallPerformance}</p>
                </div>
                
                {/* Question-by-question analysis */}
                {allAnalyses.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Question-by-Question Analysis</h4>
                    <div className="space-y-4">
                      {allAnalyses.map((item, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <p className="font-medium">Q{i+1}: {item.question}</p>
                          <p className="text-sm mt-1 text-muted-foreground">Your answer: {item.answer}</p>
                          {renderAnalysis(item.analysis)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">Strengths</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {interviewReport.strengths.map((strength, index) => (
                      <li key={index} className="text-muted-foreground">{strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Areas for Improvement</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {interviewReport.improvements.map((improvement, index) => (
                      <li key={index} className="text-muted-foreground">{improvement}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Tips for Future Interviews</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {interviewReport.tips.map((tip, index) => (
                      <li key={index} className="text-muted-foreground">{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-6">
                <Button onClick={() => window.location.reload()}>Start New Interview</Button>
                <Button 
                  variant="outline" 
                  onClick={endInterview}
                  className="border-red-200 hover:bg-red-50"
                >
                  Release Camera & Mic
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default ResumeInterview; 