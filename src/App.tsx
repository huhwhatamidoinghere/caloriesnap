import React, { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Upload, Utensils, Info, ArrowRight, CheckCircle2, AlertCircle, Dumbbell, Calendar, Clock, Apple, Target, MapPin, Footprints, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeFoodImage, NutritionAnalysis, FoodItem, generateWorkoutPlan, WorkoutPlan, getExerciseInfo, ExerciseInfo, calculateJourney, JourneyPlan } from './services/geminiService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'calorie' | 'workout' | 'journey'>('calorie');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [minCalories, setMinCalories] = useState<number>(300);
  const [maxCalories, setMaxCalories] = useState<number>(700);

  // Workout state
  const [exercise, setExercise] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | ''>('');
  const [targetWeight, setTargetWeight] = useState<number | ''>('');
  const [includeCalendar, setIncludeCalendar] = useState(true);
  const [includeDuration, setIncludeDuration] = useState(true);
  const [includeComplementary, setIncludeComplementary] = useState(true);
  const [includeDiet, setIncludeDiet] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  // Journey state
  const [journeyFrom, setJourneyFrom] = useState('');
  const [journeyTo, setJourneyTo] = useState('');
  const [includeTreadmill, setIncludeTreadmill] = useState(false);
  const [journeyPlan, setJourneyPlan] = useState<JourneyPlan | null>(null);
  const [isCalculatingJourney, setIsCalculatingJourney] = useState(false);

  // Exercise Info state
  const [selectedExercise, setSelectedExercise] = useState<ExerciseInfo | null>(null);
  const [isFetchingExercise, setIsFetchingExercise] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please ensure you've granted permission.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Resize for performance
      const maxDim = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > height) {
        if (width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeFoodImage(image, minCalories, maxCalories);
      setAnalysis(result);
    } catch (err) {
      setError("Analysis failed. Please try again with a clearer photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateWorkout = async () => {
    if (!exercise) {
      setError("Please enter an exercise.");
      return;
    }
    
    setIsPlanning(true);
    setError(null);
    try {
      const result = await generateWorkoutPlan({
        exercise,
        currentWeight: currentWeight === '' ? undefined : currentWeight,
        targetWeight: targetWeight === '' ? undefined : targetWeight,
        includeCalendar,
        includeDuration,
        includeComplementary,
        includeDiet
      });
      setWorkoutPlan(result);
    } catch (err) {
      setError("Failed to generate workout plan. Please try again.");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExerciseClick = async (name: string) => {
    if (!name || name.toLowerCase().includes('rest') || name.toLowerCase().includes('none')) return;
    
    setIsFetchingExercise(true);
    try {
      const info = await getExerciseInfo(name);
      setSelectedExercise(info);
    } catch (err) {
      setError("Failed to fetch exercise info.");
    } finally {
      setIsFetchingExercise(false);
    }
  };

  const handleCalculateJourney = async () => {
    if (!journeyFrom || !journeyTo) {
      setError("Please enter both starting point and destination.");
      return;
    }
    
    setIsCalculatingJourney(true);
    setError(null);
    try {
      const result = await calculateJourney({
        from: journeyFrom,
        to: journeyTo,
        includeTreadmill
      });
      setJourneyPlan(result);
    } catch (err) {
      setError("Failed to calculate journey. Please try again.");
    } finally {
      setIsCalculatingJourney(false);
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setWorkoutPlan(null);
    setJourneyPlan(null);
    setExercise('');
    setJourneyFrom('');
    setJourneyTo('');
    setError(null);
    setCameraActive(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => { setActiveTab('calorie'); reset(); }}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-all ${activeTab === 'calorie' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <Utensils className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-bold">CalorieSnap</span>
            </button>
            <button 
              onClick={() => { setActiveTab('workout'); reset(); }}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-all ${activeTab === 'workout' ? 'bg-blue-500 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <Dumbbell className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-bold">Workout</span>
            </button>
            <button 
              onClick={() => { setActiveTab('journey'); reset(); }}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-all ${activeTab === 'journey' ? 'bg-amber-500 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <MapPin className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-bold">Journey</span>
            </button>
          </div>
          {(image || workoutPlan || journeyPlan) && (
            <button 
              onClick={reset}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'calorie' ? (
            // CalorieSnap Content
            <motion.div key="calorie-tab" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {!image && !cameraActive ? (
                <motion.div 
                  key="initial"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 pt-8 text-center"
                >
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-zinc-900">Track your meal in seconds</h2>
                    <p className="text-zinc-500">Take a photo of your plate and let AI do the math.</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Set Calorie Goals</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Min Calories</label>
                        <input 
                          type="number" 
                          value={minCalories}
                          onChange={(e) => setMinCalories(Number(e.target.value))}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Max Calories</label>
                        <input 
                          type="number" 
                          value={maxCalories}
                          onChange={(e) => setMaxCalories(Number(e.target.value))}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={startCamera}
                      className="flex items-center justify-center gap-3 bg-zinc-900 text-white p-6 rounded-2xl hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                    >
                      <Camera className="w-6 h-6" />
                      <span className="text-lg font-semibold">Open Camera</span>
                    </button>

                    <label className="flex items-center justify-center gap-3 bg-white border-2 border-dashed border-zinc-200 text-zinc-600 p-6 rounded-2xl hover:border-zinc-400 cursor-pointer transition-all active:scale-95">
                      <Upload className="w-6 h-6" />
                      <span className="text-lg font-semibold">Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="pt-8 flex flex-col gap-4 text-left">
                    <div className="flex gap-4 items-start p-4 bg-white rounded-xl border border-zinc-100">
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900">Instant Breakdown</h3>
                        <p className="text-sm text-zinc-500">Get calories, protein, carbs, and fats for every item.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start p-4 bg-white rounded-xl border border-zinc-100">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900">Smart Estimation</h3>
                        <p className="text-sm text-zinc-500">AI estimates portion sizes based on visual cues.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : cameraActive ? (
                <motion.div 
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl"
                >
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-8">
                    <button 
                      onClick={stopCamera}
                      className="bg-white/20 backdrop-blur-md text-white p-4 rounded-full hover:bg-white/30 transition-colors"
                    >
                      <RefreshCw className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={captureImage}
                      className="w-20 h-20 bg-white rounded-full border-4 border-zinc-300 flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                    >
                      <div className="w-16 h-16 bg-white rounded-full border-2 border-zinc-900" />
                    </button>
                    <div className="w-14" /> {/* Spacer */}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-xl bg-zinc-200">
                    <img src={image!} alt="Food preview" className="w-full h-full object-cover" />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="mb-4"
                        >
                          <RefreshCw className="w-10 h-10" />
                        </motion.div>
                        <h3 className="text-xl font-bold mb-2">Analyzing your meal...</h3>
                        <p className="text-white/80 text-sm max-w-[200px]">Identifying ingredients and estimating portions</p>
                      </div>
                    )}
                  </div>

                  {!analysis && !isAnalyzing && (
                    <button
                      onClick={handleAnalyze}
                      className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      Analyze Calories
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-700">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {analysis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                        <div className="flex items-end justify-between mb-6">
                          <div>
                            <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Total Calories</p>
                            <h2 className="text-5xl font-black text-zinc-900">{analysis.totalCalories}</h2>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-tight">
                              Estimated
                            </span>
                          </div>
                        </div>

                        <p className="text-zinc-600 leading-relaxed italic border-l-4 border-emerald-500 pl-4 py-1">
                          "{analysis.summary}"
                        </p>

                        {analysis.advice && (
                          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <div className="flex items-center gap-2 mb-2 text-amber-700">
                              <Info className="w-4 h-4" />
                              <h4 className="text-xs font-bold uppercase tracking-wider">Goal Advice</h4>
                            </div>
                            <p className="text-sm text-amber-900 leading-relaxed">
                              {analysis.advice}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-lg font-bold text-zinc-900 px-1">Breakdown</h3>
                        {analysis.items.map((item, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <h4 className="font-bold text-zinc-900">{item.name}</h4>
                              <p className="text-xs text-zinc-500 font-medium">{item.estimatedWeight}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-zinc-900">{item.calories} <span className="text-[10px] font-bold text-zinc-400 uppercase">kcal</span></p>
                              <div className="flex gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                                <span>P: {item.protein}</span>
                                <span>C: {item.carbs}</span>
                                <span>F: {item.fat}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <button
                        onClick={reset}
                        className="w-full bg-zinc-100 text-zinc-600 p-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                      >
                        Analyze Another Meal
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : activeTab === 'workout' ? (
            // Workout Planner Content
            <motion.div key="workout-tab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pt-8">
              {!workoutPlan ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-zinc-900">Personal Workout Planner</h2>
                    <p className="text-zinc-500">Optimize your routine with AI-driven insights.</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-400 uppercase">Current Weight (kg)</label>
                          <input 
                            type="number" 
                            placeholder="Optional"
                            value={currentWeight}
                            onChange={(e) => setCurrentWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-400 uppercase">Target Weight (kg)</label>
                          <input 
                            type="number" 
                            placeholder="Optional"
                            value={targetWeight}
                            onChange={(e) => setTargetWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Exercise you're doing</label>
                        <div className="relative">
                          <Dumbbell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                          <input 
                            type="text" 
                            placeholder="e.g. Bench Press, Running, Yoga"
                            value={exercise}
                            onChange={(e) => setExercise(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-12 pr-4 py-3 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Include in Plan</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'calendar', label: 'Workout Calendar', icon: Calendar, state: includeCalendar, setter: setIncludeCalendar },
                          { id: 'duration', label: 'Workout Duration', icon: Clock, state: includeDuration, setter: setIncludeDuration },
                          { id: 'complementary', label: 'Complementary Workouts', icon: Target, state: includeComplementary, setter: setIncludeComplementary },
                          { id: 'diet', label: 'Meal/Diet Calendar', icon: Apple, state: includeDiet, setter: setIncludeDiet },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => item.setter(!item.state)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${item.state ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-bold">{item.label}</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${item.state ? 'bg-blue-500 border-blue-500' : 'border-zinc-300'}`}>
                              {item.state && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateWorkout}
                      disabled={isPlanning || !exercise}
                      className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isPlanning ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Generating Plan...
                        </>
                      ) : (
                        <>
                          Generate My Plan
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Target Body Part</p>
                        <h2 className="text-3xl font-black text-zinc-900">{workoutPlan.targetBodyPart}</h2>
                        <button 
                          onClick={() => handleExerciseClick(exercise)}
                          className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                        >
                          <Info className="w-3 h-3" />
                          How to do {exercise}
                        </button>
                      </div>
                      {workoutPlan.duration && (
                        <div className="text-right">
                          <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Duration</p>
                          <p className="text-xl font-black text-blue-600">{workoutPlan.duration}</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-zinc-700 leading-relaxed">
                        {workoutPlan.analysis}
                      </p>
                    </div>

                    {workoutPlan.complementaryWorkouts && workoutPlan.complementaryWorkouts.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          Complementary Workouts
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {workoutPlan.complementaryWorkouts.map((w, i) => (
                            <button 
                              key={i} 
                              onClick={() => handleExerciseClick(w)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {workoutPlan.workoutCalendar && workoutPlan.workoutCalendar.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          Workout Calendar
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {workoutPlan.workoutCalendar.map((day, i) => (
                            <button 
                              key={i} 
                              onClick={() => handleExerciseClick(day.activity)}
                              className="bg-blue-50/50 rounded-2xl border border-blue-100 p-4 space-y-2 text-left hover:bg-blue-100/50 transition-colors group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{day.day}</span>
                              </div>
                              <h4 className="font-bold text-zinc-900 text-sm group-hover:text-blue-700 transition-colors">{day.activity}</h4>
                              {day.details && <p className="text-xs text-zinc-500 leading-relaxed">{day.details}</p>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {workoutPlan.dietCalendar && workoutPlan.dietCalendar.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                          <Apple className="w-4 h-4 text-emerald-500" />
                          Meal Plan
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {workoutPlan.dietCalendar.map((day, i) => (
                            <div key={i} className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{day.day}</span>
                              </div>
                              <h4 className="font-bold text-zinc-900 text-sm">{day.activity}</h4>
                              {day.details && <p className="text-xs text-zinc-500 leading-relaxed">{day.details}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setWorkoutPlan(null)}
                      className="w-full bg-zinc-100 text-zinc-600 p-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                    >
                      Create New Plan
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </motion.div>
          ) : (
            // Journey Content
            <motion.div key="journey-tab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pt-8">
              {!journeyPlan ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-zinc-900">Journey Planner</h2>
                    <p className="text-zinc-500">Calculate your walking stats and treadmill equivalents.</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">From</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                          <input 
                            type="text" 
                            placeholder="Starting point"
                            value={journeyFrom}
                            onChange={(e) => setJourneyFrom(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-12 pr-4 py-3 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">To</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                          <input 
                            type="text" 
                            placeholder="Destination"
                            value={journeyTo}
                            onChange={(e) => setJourneyTo(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-12 pr-4 py-3 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIncludeTreadmill(!includeTreadmill)}
                      className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all ${includeTreadmill ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5" />
                        <span className="font-bold">Treadmill Equivalent</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${includeTreadmill ? 'bg-amber-500 border-amber-500' : 'border-zinc-300'}`}>
                        {includeTreadmill && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </button>

                    <button
                      onClick={handleCalculateJourney}
                      disabled={isCalculatingJourney || !journeyFrom || !journeyTo}
                      className="w-full bg-amber-500 text-white p-5 rounded-2xl font-bold text-lg shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isCalculatingJourney ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          Calculate Journey
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Miles</p>
                        <p className="text-xl font-black text-zinc-900">{journeyPlan.distanceMiles}</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <Zap className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Calories</p>
                        <p className="text-xl font-black text-zinc-900">{journeyPlan.caloriesBurned}</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <Footprints className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Steps</p>
                        <p className="text-xs font-black text-zinc-900 mt-1">{journeyPlan.stepRange}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-zinc-700 leading-relaxed text-sm">
                        {journeyPlan.summary}
                      </p>
                    </div>

                    {journeyPlan.treadmillEquivalent && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          Treadmill Equivalent
                        </h3>
                        <div className="bg-amber-50/50 rounded-3xl border border-amber-100 p-6 space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-amber-600 uppercase">Time</p>
                              <p className="text-lg font-black text-zinc-900">{journeyPlan.treadmillEquivalent.timeMinutes}m</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-amber-600 uppercase">Speed</p>
                              <p className="text-lg font-black text-zinc-900">{journeyPlan.treadmillEquivalent.speedMph}mph</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-amber-600 uppercase">Incline</p>
                              <p className="text-lg font-black text-zinc-900">{journeyPlan.treadmillEquivalent.inclinePercent}%</p>
                            </div>
                          </div>
                          <p className="text-xs text-amber-800 leading-relaxed text-center italic">
                            {journeyPlan.treadmillEquivalent.description}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setJourneyPlan(null)}
                      className="w-full bg-zinc-100 text-zinc-600 p-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                    >
                      Plan New Journey
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      {/* Exercise Info Modal */}
      <AnimatePresence>
        {(selectedExercise || isFetchingExercise) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExercise(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              {isFetchingExercise ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="font-bold text-zinc-900">Loading exercise details...</p>
                </div>
              ) : selectedExercise && (
                <div className="flex flex-col">
                  <div className="relative aspect-video bg-zinc-100">
                    {selectedExercise.imageUrl ? (
                      <img src={selectedExercise.imageUrl} alt={selectedExercise.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <Dumbbell className="w-12 h-12" />
                      </div>
                    )}
                    <button 
                      onClick={() => setSelectedExercise(null)}
                      className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                    >
                      <RefreshCw className="w-5 h-5 rotate-45" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <h3 className="text-2xl font-black text-zinc-900">{selectedExercise.name}</h3>
                    <div className="prose prose-sm text-zinc-600 leading-relaxed">
                      {selectedExercise.explanation}
                    </div>
                    <button 
                      onClick={() => setSelectedExercise(null)}
                      className="w-full bg-zinc-900 text-white p-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
