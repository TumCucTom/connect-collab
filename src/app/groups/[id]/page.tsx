'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { formatAnswerLength } from '@/lib/utils';

interface Group { id: string; name: string; code: string; }
interface Clue {
  id: string;
  text: string;
  answer: string;
  wordData?: Record<string, string>; // Store word classifications
  author: { name: string };
  solutions: { correct: boolean; member: { name: string } }[];
}
interface Member { id: string; name: string; score: number; }

export default function GroupPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newClue, setNewClue] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState('clues');
  const [currentClue, setCurrentClue] = useState<Clue | null>(null);
  const [showClueAnswer, setShowClueAnswer] = useState(false);
  
  // New state variables for word classification
  const [isClassifying, setIsClassifying] = useState(false);
  const [submittedClueId, setSubmittedClueId] = useState<string | null>(null);
  const [submittedClueText, setSubmittedClueText] = useState<string>('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordClassifications, setWordClassifications] = useState<Record<string, string>>({});
  
  // New state variables for hints
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedHints, setRevealedHints] = useState<{
    indicator?: string[];
    fodder?: string[];
    definition?: string[];
    letters?: Array<{ letter: string, position: number }>
  }>({});
  
  // State for letter box input
  const [answerLetters, setAnswerLetters] = useState<string[]>([]);
  const answerInputRef = useRef<HTMLDivElement>(null);

  // In the state variables section, add:
  const [incorrectGuesses, setIncorrectGuesses] = useState(0);
  const [guessMessage, setGuessMessage] = useState('');

  // In the state variables section, after the word classification states
  const [classificationComplete, setClassificationComplete] = useState(false);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);

  const fetchGroupData = useCallback(async () => {
    try {
      const [groupRes, cluesRes, membersRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/clues`),
        fetch(`/api/groups/${groupId}/members`),
      ]);

      if (!groupRes.ok || !cluesRes.ok || !membersRes.ok) throw new Error('Failed to fetch data');

      const groupData = await groupRes.json();
      const cluesData = await cluesRes.json();
      const membersData = await membersRes.json();

      setGroup(groupData);
      setClues(cluesData);
      setMembers(membersData);
      
      if (!currentClue) {
        const firstUnsolved = cluesData.find((clue: Clue) => !clue.solutions.some(s => s.correct));
        if (firstUnsolved) setCurrentClue(firstUnsolved);
      }
    } catch {
      setError('Failed to load group data');
    }
  }, [groupId, currentClue]);

  useEffect(() => { fetchGroupData(); }, [fetchGroupData]);

  const handleSubmitClue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/groups/${groupId}/clues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newClue, answer: newAnswer }),
      });
      
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit clue');
      
      const data = await res.json();
      
      // Save the submitted clue text and ID for classification
      setSubmittedClueId(data.id);
      setSubmittedClueText(newClue);
      
      // Start the classification process
      setIsClassifying(true);
      setCurrentWordIndex(0);
      setWordClassifications({});
      
      // Clear form
      setNewClue('');
      setNewAnswer('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit clue');
    }
  };

  // Update the classifyWord function to handle the last word
  const classifyWord = (type: 'indicator' | 'fodder' | 'definition') => {
    const words = submittedClueText.split(/\s+/);
    
    if (currentWordIndex < words.length) {
      const word = words[currentWordIndex];
      
      // Add classification for this word
      setWordClassifications(prev => ({
        ...prev,
        [word]: type
      }));
      
      // If this is the last word, mark classification as complete but don't save yet
      if (currentWordIndex === words.length - 1) {
        setClassificationComplete(true);
      } else {
        // Otherwise move to next word
        setCurrentWordIndex(prev => prev + 1);
      }
    }
  };

  // New function to handle redoing the classification
  const redoClassification = () => {
    setCurrentWordIndex(0);
    setWordClassifications({});
    setClassificationComplete(false);
  };

  // Save word classifications to the database
  const saveWordClassifications = async () => {
    if (!submittedClueId) return;
    
    try {
      const res = await fetch(`/api/groups/${groupId}/clues/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clueId: submittedClueId, wordData: wordClassifications }),
      });
      
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save word classifications');
      
      // Reset classification state and refresh data
      setIsClassifying(false);
      setSubmittedClueId(null);
      setSubmittedClueText('');
      fetchGroupData();
      setActiveTab('clues');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save word classifications');
      setIsClassifying(false);
    }
  };

  // Update the selectClue function to reset revealed positions
  const selectClue = (clue: Clue) => {
    setCurrentClue(clue);
    setShowClueAnswer(false);
    setHintsUsed(0);
    setRevealedHints({});
    setIncorrectGuesses(0);
    setGuessMessage('');
    setRevealedPositions([]);
    
    // Initialize empty answer letters based on answer length
    if (clue.answer) {
      // Create array of empty strings with the right length, preserving spaces
      const letterArray = Array.from(clue.answer).map(char => 
        char === ' ' ? ' ' : ''
      );
      setAnswerLetters(letterArray);
    }
  };

  // Handle letter box input
  const handleLetterInput = (index: number, value: string) => {
    // Don't modify a revealed letter
    if (revealedHints.letters?.some(hint => hint.position === index)) {
      return;
    }
    
    // Only allow a single uppercase letter or empty for backspace
    const letter = value === '' ? '' : value.toUpperCase().slice(-1);
    
    // Update the specific letter
    setAnswerLetters(prev => {
      const newLetters = [...prev];
      newLetters[index] = letter;
      return newLetters;
    });
    
    // If a letter was added (not emptied), focus the next input box if available
    if (letter && answerInputRef.current) {
      // Find the next index in the answerLetters array
      let nextLetterIndex = index + 1;
      
      // Skip any spaces
      while (
        nextLetterIndex < answerLetters.length && 
        answerLetters[nextLetterIndex] === ' '
      ) {
        nextLetterIndex++;
      }
      
      // Make sure we're within bounds
      if (nextLetterIndex < answerLetters.length) {
        // Find the actual input element (account for spaces which are divs)
        // Count the input elements up to our target index
        const inputs = Array.from(answerInputRef.current.querySelectorAll('input'));
        
        // Count how many non-space characters are before our target index
        let letterCount = 0;
        for (let i = 0; i < nextLetterIndex; i++) {
          if (answerLetters[i] !== ' ') {
            letterCount++;
          }
        }
        
        // If we have an input at this position and it's not disabled
        if (letterCount < inputs.length && !inputs[letterCount].disabled) {
          inputs[letterCount].focus();
        }
      }
    }
  };

  // Add a new function to handle keyboard navigation
  const handleLetterKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!answerInputRef.current) return;
    
    // Convert current index in answerLetters to input index
    // We need to map between physical inputs and logical letter positions
    // because spaces are rendered as divs, not inputs
    let currentInputIndex = 0;
    for (let i = 0; i < index; i++) {
      if (answerLetters[i] !== ' ') {
        currentInputIndex++;
      }
    }
    
    const inputs = Array.from(answerInputRef.current.querySelectorAll('input'));
    
    if (e.key === 'ArrowLeft') {
      // Find the previous letter position (skipping spaces)
      let prevIndex = index - 1;
      while (prevIndex >= 0 && answerLetters[prevIndex] === ' ') {
        prevIndex--;
      }
      
      if (prevIndex >= 0) {
        // Map this position to an input index
        let prevInputIndex = 0;
        for (let i = 0; i < prevIndex; i++) {
          if (answerLetters[i] !== ' ') {
            prevInputIndex++;
          }
        }
        
        // Focus this input if it's not disabled
        if (!inputs[prevInputIndex].disabled) {
          inputs[prevInputIndex].focus();
        }
      }
    } else if (e.key === 'ArrowRight') {
      // Find the next letter position (skipping spaces)
      let nextIndex = index + 1;
      while (nextIndex < answerLetters.length && answerLetters[nextIndex] === ' ') {
        nextIndex++;
      }
      
      if (nextIndex < answerLetters.length) {
        // Map this position to an input index
        let nextInputIndex = 0;
        for (let i = 0; i < nextIndex; i++) {
          if (answerLetters[i] !== ' ') {
            nextInputIndex++;
          }
        }
        
        // Focus this input if it's not disabled
        if (nextInputIndex < inputs.length && !inputs[nextInputIndex].disabled) {
          inputs[nextInputIndex].focus();
        }
      }
    } else if (e.key === 'Backspace') {
      // Clear the current letter if it exists
      const hasValue = (e.currentTarget as HTMLInputElement).value !== '';
      
      if (hasValue) {
        // Just let the default backspace behavior happen
        return;
      }
      
      // If no value, move to previous letter position (skipping spaces)
      let prevIndex = index - 1;
      while (prevIndex >= 0 && answerLetters[prevIndex] === ' ') {
        prevIndex--;
      }
      
      if (prevIndex >= 0) {
        // Map this position to an input index
        let prevInputIndex = 0;
        for (let i = 0; i < prevIndex; i++) {
          if (answerLetters[i] !== ' ') {
            prevInputIndex++;
          }
        }
        
        // Focus this input if it's not disabled
        if (!inputs[prevInputIndex].disabled) {
          inputs[prevInputIndex].focus();
        }
      }
    }
  };

  // Prepare the answer from letter boxes for submission
  const prepareAnswerFromLetters = () => {
    return answerLetters.join('');
  };

  // Handle submit with letter boxes
  const handleSubmitLetterBoxSolution = (clueId: string) => {
    const answer = prepareAnswerFromLetters();
    handleSubmitSolution(clueId, answer);
  };

  const handleSubmitSolution = async (clueId: string, answer?: string) => {
    try {
      // If no answer provided, use the one from the solutions state
      const submittedAnswer = answer || solutions[clueId];
      
      // Check remaining points - if none left, reveal answer
      const remainingPoints = Math.max(10 - hintsUsed - incorrectGuesses, 0);
      if (remainingPoints === 0) {
        setShowClueAnswer(true);
        setGuessMessage("No points remaining. Answer revealed.");
        return;
      }
      
      // Get current clue to check against
      const currentClueAnswer = currentClue?.answer.toUpperCase();
      
      // Check if answer is correct locally first
      const isCorrect = submittedAnswer.toUpperCase() === currentClueAnswer;
      
      if (!isCorrect) {
        // Handle incorrect guess
        setIncorrectGuesses(prev => prev + 1);
        
        // Calculate remaining points after this incorrect guess
        const pointsRemaining = Math.max(10 - hintsUsed - (incorrectGuesses + 1), 0);
        
        if (pointsRemaining === 0) {
          // No points left, reveal answer
          setShowClueAnswer(true);
          setGuessMessage("Incorrect. No points remaining. Answer revealed.");
        } else {
          // Still has points, can try again
          setGuessMessage(`Incorrect. ${pointsRemaining} point${pointsRemaining !== 1 ? 's' : ''} remaining.`);
        }
        return;
      }
      
      // If we get here, the answer is correct, so submit to the API
      const res = await fetch(`/api/groups/${groupId}/clues/${clueId}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          answer: submittedAnswer,
          hintsUsed: hintsUsed + incorrectGuesses // Include incorrect guesses in point deduction
        }),
      });
      
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit solution');
      
      const data = await res.json();
      
      setSolutions(prev => ({ ...prev, [clueId]: '' }));
      setShowClueAnswer(true);
      
      // Display points earned if correct
      setGuessMessage(`Correct! You earned ${data.pointsEarned} points.`);
      
      // Reset hints state
      setHintsUsed(0);
      setRevealedHints({});
      setIncorrectGuesses(0);
      
      fetchGroupData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit solution');
    }
  };

  // Highlight words based on their classification
  const renderHighlightedClue = () => {
    if (!currentClue) return null;
    
    // Initialize an array to track which words should be highlighted
    const words = currentClue.text.split(/\s+/);
    const wordHighlights = new Array(words.length).fill(null);
    
    // Check for revealed hints
    if (revealedHints.indicator && currentClue.wordData) {
      words.forEach((word, index) => {
        if (revealedHints.indicator?.includes(word)) {
          wordHighlights[index] = 'indicator';
        }
      });
    }
    
    if (revealedHints.fodder && currentClue.wordData) {
      words.forEach((word, index) => {
        if (revealedHints.fodder?.includes(word)) {
          wordHighlights[index] = 'fodder';
        }
      });
    }
    
    if (revealedHints.definition && currentClue.wordData) {
      words.forEach((word, index) => {
        if (revealedHints.definition?.includes(word)) {
          wordHighlights[index] = 'definition';
        }
      });
    }
    
    // Return the marked-up clue text
    return (
      <div className="mb-4">
        {words.map((word, index) => {
          const highlight = wordHighlights[index];
          let className = '';
          
          if (highlight === 'indicator') {
            className = 'inline-block bg-blue-200 px-1 py-0.5 rounded';
          } else if (highlight === 'fodder') {
            className = 'inline-block bg-green-200 px-1 py-0.5 rounded';
          } else if (highlight === 'definition') {
            className = 'inline-block bg-purple-200 px-1 py-0.5 rounded';
          }
          
          return (
            <span key={index}>
              {index > 0 && ' '}
              <span className={className || undefined}>{word}</span>
            </span>
          );
        })}
        {' '}{formatAnswerLength(currentClue.answer)}
      </div>
    );
  };

  // Update the getHint function to track revealed positions
  const getHint = async (hintType: string) => {
    if (!currentClue) return;
    
    try {
      const res = await fetch(`/api/groups/${groupId}/clues/${currentClue.id}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hintType,
          revealedPositions 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get hint');
      }
      
      const data = await res.json();
      
      // Increment hint counter
      setHintsUsed(prev => prev + 1);
      
      // Update revealed hints based on hint type
      if (hintType === 'random_letter') {
        const hint = data.hint;
        
        // Track this position as revealed
        setRevealedPositions(prev => [...prev, hint.position]);
        
        // Update the letter boxes with the revealed letter
        setAnswerLetters(prev => {
          const newLetters = [...prev];
          newLetters[hint.position] = hint.letter;
          return newLetters;
        });
        
        setRevealedHints(prev => ({
          ...prev,
          letters: [...(prev.letters || []), hint]
        }));
      } else if (['indicator', 'fodder', 'definition'].includes(hintType)) {
        setRevealedHints(prev => ({
          ...prev,
          [hintType]: data.hint.words
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get hint');
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 text-black font-mono">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 mb-6 rounded text-sm">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="underline">Dismiss</button>
          </div>
        </div>
      )}

      {group && (
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <div className="text-sm mt-2 md:mt-0">
              <span className="mr-2 text-gray-500">Code:</span>
              <span className="bg-gray-100 px-3 py-1 rounded">{showCode ? group.code : '••••••'}</span>
              <button onClick={() => setShowCode(!showCode)} className="ml-2 underline text-black text-xs">
                {showCode ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-6 border-b border-gray-200 mb-6">
        {['clues', 'create', 'leaderboard'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 font-semibold ${activeTab === tab ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'}`}
          >
            {tab === 'clues' ? 'Solve Clues' : tab === 'create' ? 'Submit Clue' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* Handle word classification after submitting a clue */}
      {isClassifying && (
        <section className="border border-gray-300 rounded p-4 mb-6">
          <h2 className="text-xl font-bold mb-4">Classify Each Word</h2>
          <p className="mb-4">For each word, select whether it's an indicator, fodder, or definition in your cryptic clue.</p>
          
          <div className="mb-6">
            <div className="flex space-x-1 mb-2">
              {submittedClueText.split(/\s+/).map((word, idx) => (
                <span 
                  key={idx} 
                  className={`px-2 py-1 rounded ${
                    idx === currentWordIndex && !classificationComplete
                      ? 'bg-black text-white' 
                      : idx < currentWordIndex || classificationComplete
                        ? 'bg-gray-100' 
                        : ''
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
            
            {!classificationComplete ? (
              <>
                <p className="text-sm mb-4">
                  Current word: <strong>{submittedClueText.split(/\s+/)[currentWordIndex]}</strong>
                </p>
                
                <div className="flex space-x-4">
                  <button 
                    onClick={() => classifyWord('indicator')}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:opacity-90"
                  >
                    Indicator
                  </button>
                  <button 
                    onClick={() => classifyWord('fodder')}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:opacity-90"
                  >
                    Fodder
                  </button>
                  <button 
                    onClick={() => classifyWord('definition')}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:opacity-90"
                  >
                    Definition
                  </button>
                </div>
              </>
            ) : (
              <div className="flex space-x-4 mt-4">
                <button 
                  onClick={() => saveWordClassifications()}
                  className="bg-black text-white px-4 py-2 rounded hover:opacity-90"
                >
                  Done
                </button>
                <button 
                  onClick={() => redoClassification()}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:opacity-90"
                >
                  Redo
                </button>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            <p><strong>Indicator:</strong> Words that tell the solver how to manipulate the fodder (e.g., "mixed," "contains," "reversed")</p>
            <p><strong>Fodder:</strong> The letters/words that will be manipulated to form the answer</p>
            <p><strong>Definition:</strong> A direct or indirect definition of the answer</p>
          </div>
        </section>
      )}

      {activeTab === 'create' && !isClassifying && (
        <section>
          <h2 className="text-xl font-bold mb-4">Create a New Clue</h2>
          <form onSubmit={handleSubmitClue} className="space-y-4">
            <input
              type="text"
              value={newClue}
              onChange={(e) => setNewClue(e.target.value)}
              placeholder="Clue text"
              className="w-full border border-gray-300 px-4 py-2 rounded"
              required
            />
            <input
              type="text"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Answer"
              className="w-full border border-gray-300 px-4 py-2 rounded"
              required
            />
            <button type="submit" className="bg-black text-white px-4 py-2 rounded hover:opacity-90">
              Submit
            </button>
          </form>
        </section>
      )}

      {activeTab === 'clues' && (
        <div className="grid md:grid-cols-3 gap-6">
          <aside className="space-y-2">
            <h3 className="text-lg font-semibold">Clues</h3>
            {clues.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No clues yet.</p>
            ) : (
              clues.map(clue => (
                <button
                  key={clue.id}
                  onClick={() => selectClue(clue)}
                  className={`block w-full text-left px-4 py-2 rounded hover:bg-gray-100 ${
                    currentClue?.id === clue.id ? 'bg-gray-100 border-l-4 border-black' : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="truncate">{clue.text} {formatAnswerLength(clue.answer)}</span>
                    {clue.solutions.some(s => s.correct) && <span className="text-green-500">✓</span>}
                  </div>
                  <p className="text-xs text-gray-500">by {clue.author.name}</p>
                </button>
              ))
            )}
          </aside>

          <section className="md:col-span-2">
            {currentClue ? (
              <div>
                <div className="mb-2 text-sm text-gray-500">by {currentClue.author.name}</div>
                
                {/* Highlighted clue text */}
                <h3 className="text-2xl font-bold">
                  {renderHighlightedClue()}
                </h3>

                {currentClue.solutions.some(s => s.correct) || showClueAnswer ? (
                  <div className="flex gap-2 mb-4">
                    {currentClue.answer.toUpperCase().split('').map((char, idx) => (
                      <span key={idx} className="w-10 h-10 border border-black rounded flex items-center justify-center text-lg font-bold uppercase">
                        {char}
                      </span>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Display revealed letter hints if any */}
                    {revealedHints.letters && revealedHints.letters.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Revealed Letters:</h4>
                        <div className="flex flex-wrap gap-2">
                          {revealedHints.letters.map((hint, idx) => (
                            <div key={idx} className="bg-gray-100 px-3 py-1 rounded text-sm">
                              Letter <strong>{hint.letter}</strong> at position {hint.position + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display word type hints if any */}
                    {(revealedHints.indicator || revealedHints.fodder || revealedHints.definition) && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Revealed Hints:</h4>
                        <div className="space-y-2">
                          {revealedHints.indicator && (
                            <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded">
                              <span className="text-blue-800 font-semibold">Indicators: </span>
                              {revealedHints.indicator.join(', ')}
                            </div>
                          )}
                          {revealedHints.fodder && (
                            <div className="bg-green-50 border border-green-200 px-3 py-2 rounded">
                              <span className="text-green-800 font-semibold">Fodder: </span>
                              {revealedHints.fodder.join(', ')}
                            </div>
                          )}
                          {revealedHints.definition && (
                            <div className="bg-purple-50 border border-purple-200 px-3 py-2 rounded">
                              <span className="text-purple-800 font-semibold">Definition: </span>
                              {revealedHints.definition.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Letter box input */}
                    <div className="flex flex-wrap gap-2 mb-4" ref={answerInputRef}>
                      {answerLetters.map((letter, idx) => {
                        // Check if this letter has been revealed
                        const isRevealed = revealedHints.letters?.some(hint => hint.position === idx);
                        const revealedLetter = isRevealed 
                          ? revealedHints.letters?.find(hint => hint.position === idx)?.letter 
                          : undefined;
                        
                        if (letter === ' ') {
                          return <div key={idx} className="w-10 h-10 flex items-center justify-center" data-space="true" />;
                        }
                        
                        return (
                          <input
                            key={idx}
                            type="text"
                            value={revealedLetter || letter}
                            onChange={(e) => handleLetterInput(idx, e.target.value)}
                            onKeyDown={(e) => handleLetterKeyDown(idx, e)}
                            className={`w-10 h-10 border ${isRevealed ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'} rounded text-center uppercase font-bold text-lg focus:outline-none focus:ring-1 focus:ring-black`}
                            maxLength={1}
                            disabled={isRevealed}
                            aria-label={`Letter ${idx + 1}`}
                          />
                        );
                      })}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => handleSubmitLetterBoxSolution(currentClue.id)}
                        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                        disabled={answerLetters.filter(letter => letter !== ' ').some(letter => !letter)}
                      >
                        Check Answer
                      </button>
                      
                      {/* Hint buttons */}
                      <button 
                        onClick={() => getHint('indicator')}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-200"
                        disabled={!!revealedHints.indicator}
                      >
                        Reveal Indicator
                      </button>
                      
                      <button 
                        onClick={() => getHint('fodder')}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm hover:bg-green-200"
                        disabled={!!revealedHints.fodder}
                      >
                        Reveal Fodder
                      </button>
                      
                      <button 
                        onClick={() => getHint('definition')}
                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm hover:bg-purple-200"
                        disabled={!!revealedHints.definition}
                      >
                        Reveal Definition
                      </button>
                      
                      <button 
                        onClick={() => getHint('random_letter')}
                        className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200"
                      >
                        Reveal Letter
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {guessMessage && (
                        <div className={`text-sm py-2 px-3 rounded ${
                          guessMessage.startsWith('Correct') 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {guessMessage}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          {Math.max(10 - hintsUsed - incorrectGuesses, 0)} points remaining 
                          {(hintsUsed > 0 || incorrectGuesses > 0) && (
                            <span className="text-xs ml-1">
                              ({hintsUsed > 0 ? `${hintsUsed} hints` : ''}{hintsUsed > 0 && incorrectGuesses > 0 ? ', ' : ''}
                              {incorrectGuesses > 0 ? `${incorrectGuesses} wrong guess${incorrectGuesses !== 1 ? 'es' : ''}` : ''})
                            </span>
                          )}
                        </span>
                        
                        <button 
                          onClick={() => setShowClueAnswer(true)} 
                          className="underline text-gray-600"
                          disabled={Math.max(10 - hintsUsed - incorrectGuesses, 0) === 0}
                        >
                          Reveal Answer
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select a clue to solve.</p>
            )}
          </section>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <section>
          <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
          {members.length === 0 ? (
            <p className="text-gray-400 italic">No members yet</p>
          ) : (
            <ul className="space-y-2">
              {members.sort((a, b) => b.score - a.score).map((member, i) => (
                <li key={member.id} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-sm">{i + 1}</span>
                    <span>{member.name}</span>
                  </div>
                  <span className="font-bold">{member.score} pts</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
