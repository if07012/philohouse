"use client"
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from 'next/navigation';

// Map route language to Speech Synthesis locale
const LANGUAGE_TO_VOICE_LOCALE: { [key: string]: string } = {
    'english': 'en-US',
    'indonesian': 'id-ID',
    'arabic': 'ar',
};

function shuffleArray(array: any[]) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Number of rounds to complete the test (can be made configurable)
const MAX_ROUNDS = 1;

export default function Page() {
    const params = useParams();
    const language = params.language as string;
    const level = params.level as string;
    const [vocabulary, setVocabulary] = useState<any[]>([]);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [testMode, setTestMode] = useState(false);
    const [testVocabulary, setTestVocabulary] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [showWarning, setShowWarning] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [answered, setAnswered] = useState(false);
    const [roundNumber, setRoundNumber] = useState(1);
    const [wordResults, setWordResults] = useState<{ [key: string]: { word: string, meaning: string, correct: number, wrong: number } }>({});
    const [reportSaved, setReportSaved] = useState(false);
    const [savingReport, setSavingReport] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const speechSynthRef = useRef<SpeechSynthesis | null>(null);

    // Text-to-speech: speak the word so user can hear how to spell/pronounce it (repeat twice by default)
    const speakWord = useCallback((text: string, times: number = 2) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const locale = LANGUAGE_TO_VOICE_LOCALE[language] || 'en-US';
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith(locale.split('-')[0])) || voices.find(v => v.lang === locale);
        for (let i = 0; i < times; i++) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = locale;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            if (preferred) utterance.voice = preferred;
            window.speechSynthesis.speak(utterance);
        }
        speechSynthRef.current = window.speechSynthesis;
    }, [language]);

    useEffect(() => {
        setSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    }, []);

    // Speak the word when a new question is shown (so user hears how to spell/pronounce it)
    useEffect(() => {
        if (!testMode || completed || !testVocabulary.length) return;
        const item = testVocabulary[currentIndex];
        const word = item ? getWord(item) : '';
        if (word) speakWord(word);
        return () => { typeof window !== 'undefined' && window.speechSynthesis?.cancel(); };
    }, [testMode, completed, currentIndex, testVocabulary, speakWord]);

    useEffect(() => {
        const callApi = async () => {
            try {
                const sheetName = `${language}-${level}`;
                const response = await fetch(`/api/sheet?sheet=${sheetName}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                setVocabulary([...data]);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching vocabulary:', error);
                setLoading(false);
            }
        };
        callApi();
    }, [language, level]);

    const getLanguageName = (lang: string) => {
        const names: { [key: string]: string } = {
            'english': 'English',
            'indonesian': 'Indonesian',
            'arabic': 'Arabic'
        };
        return names[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
    };

    // Try to get word and meaning from various possible column names
    const getWord = (item: any) => {
        return item.word || item.Questions || item.vocabulary || item.term || item.english || '';
    };

    const getMeaning = (item: any) => {
        return item.meaning || item.Answer || item.translation || item.indonesian || item.definition || '';
    };

    const saveReportToSheet = async () => {
        if (reportSaved || savingReport) return;

        setSavingReport(true);
        try {
            // Calculate success rate and pass status
            const successRate = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;
            const isPass = successRate >= 100;
            const completedAt = new Date().toISOString();

            // Save detailed word report
            const reportResponse = await fetch('/api/vocabulary/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language,
                    level,
                    wordResults,
                    totalCorrect: correctCount,
                    totalAttempts,
                    completedAt
                })
            });

            if (!reportResponse.ok) {
                throw new Error('Failed to save report');
            }

            // Save level summary with pass status
            const summaryResponse = await fetch('/api/vocabulary/level-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language,
                    level,
                    totalCorrect: correctCount,
                    totalAttempts,
                    successRate,
                    isPass,
                    completedAt
                })
            });

            if (!summaryResponse.ok) {
                throw new Error('Failed to save level summary');
            }

            const reportResult = await reportResponse.json();
            const summaryResult = await summaryResponse.json();
            console.log('Report and summary saved successfully:', { reportResult, summaryResult });
            setReportSaved(true);
        } catch (error) {
            console.error('Error saving report:', error);
        } finally {
            setSavingReport(false);
        }
    };

    const generateOptions = (currentWord: any, allWords: any[]): string[] => {
        const correctMeaning = getMeaning(currentWord);
        const wrongOptions: string[] = [];

        // Get 3 random wrong answers from other words
        const otherWords = allWords.filter(w => getMeaning(w) !== correctMeaning);
        const shuffledOthers = shuffleArray([...otherWords]);

        for (let i = 0; i < Math.min(3, shuffledOthers.length); i++) {
            wrongOptions.push(getMeaning(shuffledOthers[i]));
        }

        // Combine correct answer with wrong answers and shuffle
        const allOptions = [correctMeaning, ...wrongOptions];
        return shuffleArray(allOptions);
    };

    const startTest = () => {
        if (vocabulary.length === 0) return;
        const shuffled = shuffleArray(vocabulary);
        setTestVocabulary(shuffled);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowWarning(false);
        setCorrectCount(0);
        setTotalAttempts(0);
        setCompleted(false);
        setAnswered(false);
        setRoundNumber(1);
        setWordResults({});
        setReportSaved(false);
        setSavingReport(false);
        setTestMode(true);

        // Generate options for first question
        if (shuffled.length > 0) {
            const firstOptions = generateOptions(shuffled[0], vocabulary);
            setOptions(firstOptions);
        }
    };

    const handleAnswerSelect = (answer: string) => {
        if (answered) return; // Prevent changing answer after submission

        setSelectedAnswer(answer);
        setAnswered(true);

        const currentWord = testVocabulary[currentIndex];
        const wordKey = getWord(currentWord);
        const correctMeaning = getMeaning(currentWord);
        const isCorrect = answer === correctMeaning;

        const newTotalAttempts = totalAttempts + 1;
        const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

        setTotalAttempts(newTotalAttempts);

        // Update word results
        setWordResults(prev => {
            const existing = prev[wordKey] || { word: wordKey, meaning: correctMeaning, correct: 0, wrong: 0 };
            return {
                ...prev,
                [wordKey]: {
                    ...existing,
                    correct: isCorrect ? existing.correct + 1 : existing.correct,
                    wrong: !isCorrect ? existing.wrong + 1 : existing.wrong
                }
            };
        });

        if (isCorrect) {
            setCorrectCount(newCorrectCount);
            setShowWarning(false);
        } else {
            setShowWarning(true);
        }

        // Move to next question after 2 seconds
        setTimeout(() => {
            setShowWarning(false);
            setSelectedAnswer(null);
            setAnswered(false);

            // Move to next word
            let nextIndex = currentIndex + 1;

            if (nextIndex >= testVocabulary.length) {
                // All words completed in this round
                // Check if we've completed all rounds
                if (roundNumber >= MAX_ROUNDS) {
                    // Test completed - show dashboard
                    setCompleted(true);
                } else {
                    // Start next round - reshuffle and reset
                    const reshuffled = shuffleArray(vocabulary);
                    setTestVocabulary(reshuffled);
                    setCurrentIndex(0);
                    setRoundNumber(prev => prev + 1);

                    // Generate options for first word of next round
                    const firstOptions = generateOptions(reshuffled[0], vocabulary);
                    setOptions(firstOptions);
                }
            } else {
                // Move to next word in current round
                setCurrentIndex(nextIndex);
                // Generate options will be handled by useEffect
            }
        }, isCorrect ? 500 : 2000);
    };

    useEffect(() => {
        // Generate options when current index changes
        if (testMode && testVocabulary.length > 0 && currentIndex < testVocabulary.length && !answered) {
            const currentWord = testVocabulary[currentIndex];
            const newOptions = generateOptions(currentWord, vocabulary);
            setOptions(newOptions);
            setSelectedAnswer(null);
            setAnswered(false);
            setShowWarning(false);
        }
    }, [currentIndex, testMode, testVocabulary]);

    // Save report when test is completed
    useEffect(() => {
        if (completed && !reportSaved && !savingReport && Object.keys(wordResults).length > 0) {
            saveReportToSheet();
        }
    }, [completed, wordResults, correctCount, totalAttempts]);

    const resetTest = () => {
        setTestMode(false);
        setCompleted(false);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setOptions([]);
        setShowWarning(false);
        setCorrectCount(0);
        setTotalAttempts(0);
        setAnswered(false);
        setRoundNumber(1);
        setWordResults({});
        setReportSaved(false);
        setSavingReport(false);
    };

    const currentWord = testMode && testVocabulary.length > 0 ? testVocabulary[currentIndex] : null;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
            <h1 className="text-5xl font-bold mb-6">
                {getLanguageName(language)} Vocabulary - {level}
            </h1>

            {testMode && !completed && (
                <div className="w-full max-w-2xl mb-6 bg-white p-6 rounded-lg shadow-md">
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-lg font-semibold">Round: {roundNumber}/{MAX_ROUNDS}</span>
                            <span className="text-lg font-semibold">Total Correct: {correctCount}/{totalAttempts}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${((currentIndex + 1) / testVocabulary.length) * 100}%` }}
                            ></div>
                        </div>
                        <div className="text-sm text-gray-600 text-center">
                            Word {currentIndex + 1} of {testVocabulary.length} in Round {roundNumber}
                        </div>
                    </div>

                    {currentWord && (
                        <div className="text-center mb-6">
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <h2 className="text-4xl font-bold text-blue-600">
                                    {getWord(currentWord)}
                                </h2>
                                {speechSupported && (
                                    <button
                                        type="button"
                                        onClick={() => speakWord(getWord(currentWord))}
                                        className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        title="Listen again"
                                        aria-label="Listen to pronunciation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <p className="text-lg text-gray-600 mb-6">Select the correct meaning:</p>

                            <div className="grid grid-cols-1 gap-3 mb-4">
                                {options.map((option, index) => {
                                    const isSelected = selectedAnswer === option;
                                    const isCorrect = option === getMeaning(currentWord);
                                    const isWrong = isSelected && !isCorrect && answered;
                                    const showCorrect = answered && isCorrect;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswerSelect(option)}
                                            disabled={answered}
                                            className={`px-6 py-4 text-left rounded-lg border-2 transition-all duration-200 font-semibold text-lg ${answered
                                                ? showCorrect
                                                    ? 'bg-green-100 border-green-500 text-green-800'
                                                    : isWrong
                                                        ? 'bg-red-100 border-red-500 text-red-800'
                                                        : isSelected
                                                            ? 'bg-gray-100 border-gray-400'
                                                            : 'bg-gray-50 border-gray-200 text-gray-600'
                                                : isSelected
                                                    ? 'bg-blue-100 border-blue-500 text-blue-800'
                                                    : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                                                }`}
                                        >
                                            <span className="mr-3 font-bold">{(index + 1).toString()}.</span>
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>

                            {showWarning && answered && (
                                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                    <p className="font-semibold">Wrong! The correct answer is: <span className="text-red-900">{getMeaning(currentWord)}</span></p>
                                </div>
                            )}

                            {answered && selectedAnswer === getMeaning(currentWord) && (
                                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                                    <p className="font-semibold">Correct! ✓</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {testMode && completed && (
                <div className="w-full max-w-5xl mb-6 bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-center text-green-600">Test Completed! 🎉</h2>
                        {savingReport && (
                            <div className="text-sm text-blue-600 flex items-center gap-2">
                                <span className="animate-spin">⏳</span>
                                Saving report...
                            </div>
                        )}
                        {reportSaved && (
                            <div className="text-sm text-green-600 flex items-center gap-2">
                                ✓ Report saved
                            </div>
                        )}
                    </div>

                    {/* Overall Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                            <p className="text-gray-600 mb-1">Total Correct</p>
                            <p className="text-3xl font-bold text-blue-600">{correctCount}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                            <p className="text-gray-600 mb-1">Total Attempts</p>
                            <p className="text-3xl font-bold text-gray-700">{totalAttempts}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                            <p className="text-gray-600 mb-1">Success Rate</p>
                            <p className="text-3xl font-bold text-green-600">{totalAttempts > 0 ? ((correctCount / totalAttempts) * 100).toFixed(1) : 0}%</p>
                        </div>
                    </div>

                    {/* Pass/Fail Status */}
                    {(() => {
                        const successRate = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;
                        const isPass = successRate > 90;
                        return (
                            <div className={`p-6 rounded-lg border-2 mb-6 ${isPass ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
                                <div className="text-center">
                                    {isPass ? (
                                        <>
                                            <h3 className="text-2xl font-bold text-green-800 mb-2">🎉 Level Passed!</h3>
                                            <p className="text-lg text-green-700 mb-1">Success Rate: {successRate.toFixed(1)}% (Required: 90%)</p>
                                            <p className="text-green-700">You can now move to the next level!</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-2xl font-bold text-red-800 mb-2">⚠️ Level Not Passed</h3>
                                            <p className="text-lg text-red-700 mb-1">Success Rate: {successRate.toFixed(1)}% (Required: 90%)</p>
                                            <p className="text-red-700">Please try again to master this level. You need at least 90% success rate to pass.</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Word Results Dashboard */}
                    <div className="mb-6">
                        <h3 className="text-2xl font-bold mb-4">Word Performance Dashboard</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {Object.values(wordResults).map((result, index) => {
                                const totalAttempts = result.correct + result.wrong;
                                const successRate = totalAttempts > 0 ? (result.correct / totalAttempts) * 100 : 0;
                                const isMastered = result.wrong === 0 && result.correct > 0;
                                const needsPractice = result.wrong > result.correct;

                                return (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border-2 ${isMastered
                                            ? 'bg-green-50 border-green-300'
                                            : needsPractice
                                                ? 'bg-red-50 border-red-300'
                                                : 'bg-yellow-50 border-yellow-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <h4 className="text-xl font-bold text-gray-800 mb-1">
                                                    {result.word}
                                                    {isMastered && <span className="ml-2 text-green-600">✓ Mastered</span>}
                                                    {needsPractice && <span className="ml-2 text-red-600">⚠ Needs Practice</span>}
                                                </h4>
                                                <p className="text-gray-600 text-sm mb-2">Meaning: {result.meaning}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Success Rate</p>
                                                <p className={`text-2xl font-bold ${isMastered ? 'text-green-600' : needsPractice ? 'text-red-600' : 'text-yellow-600'}`}>
                                                    {successRate.toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-semibold">✓ Correct: {result.correct}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-red-600 font-semibold">✗ Wrong: {result.wrong}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-600 font-semibold">Total: {totalAttempts}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${isMastered ? 'bg-green-500' : needsPractice ? 'bg-red-500' : 'bg-yellow-500'
                                                    }`}
                                                style={{ width: `${successRate}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary by Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-100 p-4 rounded-lg">
                            <h4 className="font-bold text-green-800 mb-2">Mastered Words ({Object.values(wordResults).filter(r => r.wrong === 0 && r.correct > 0).length})</h4>
                            <p className="text-green-700">Words you answered correctly every time!</p>
                        </div>
                        <div className="bg-red-100 p-4 rounded-lg">
                            <h4 className="font-bold text-red-800 mb-2">Words Needing Practice ({Object.values(wordResults).filter(r => r.wrong > r.correct).length})</h4>
                            <p className="text-red-700">Words with more wrong answers than correct ones.</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={resetTest}
                            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition duration-300 font-semibold text-lg"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => {
                                resetTest();
                                setTestMode(false);
                            }}
                            className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition duration-300 font-semibold text-lg"
                        >
                            Back to Learn
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-6xl">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
                                <div className="h-32 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && vocabulary.length === 0 && (
                    <div className="text-center p-8 bg-white rounded-lg shadow-md">
                        <p className="text-xl text-gray-600">No vocabulary words found.</p>
                    </div>
                )}

                {!loading && vocabulary.length > 0 && !testMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vocabulary.map((item: any, index: number) => {
                            const word = getWord(item);
                            const meaning = getMeaning(item);

                            return (
                                <div
                                    key={index}
                                    className="bg-white p-6 rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg"
                                >
                                    <div className="flex flex-col h-full">
                                        <h2 className="text-2xl font-bold mb-3 text-blue-600">
                                            {word || 'Word'}
                                        </h2>
                                        <div className="border-t border-gray-200 pt-3">
                                            <p className="text-lg text-gray-700">
                                                {meaning || 'Meaning'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-8 flex gap-4">
                {!testMode && !loading && vocabulary.length > 0 && (
                    <button
                        type="button"
                        className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition duration-300"
                        onClick={startTest}
                    >
                        <h2 className="text-2xl font-semibold">Start Test</h2>
                    </button>
                )}
                {testMode && !completed && (
                    <button
                        type="button"
                        className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition duration-300"
                        onClick={resetTest}
                    >
                        <h2 className="text-2xl font-semibold">Exit Test</h2>
                    </button>
                )}
                <button
                    type="button"
                    className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition duration-300"
                    onClick={() => {
                        router.push(`/vocabulary/${language}`);
                    }}
                >
                    <h2 className="text-2xl font-semibold">Back</h2>
                </button>
            </div>
        </div>
    );
}

