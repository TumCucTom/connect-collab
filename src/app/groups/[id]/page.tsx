'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { formatAnswerLength, getCategoryColorClass, getDifficultyColor } from '@/lib/utils';

interface Group { id: string; name: string; code: string; }
interface Word { id: string; text: string; categoryId: string; }
interface Category { id: string; name: string; color: string; words: Word[]; }
interface Puzzle {
  id: string;
  difficulty: string;
  categories: Category[];
  author: { name: string };
  attempts: { completed: boolean; member: { name: string } }[];
}
interface Member { id: string; name: string; score: number; }

export default function GroupPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState('puzzles');
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  
  // Puzzle creation states
  const [isCreatingPuzzle, setIsCreatingPuzzle] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [categories, setCategories] = useState<{name: string; color: string; words: string[]}[]>([
    {name: '', color: 'yellow', words: ['', '', '', '']},
    {name: '', color: 'green', words: ['', '', '', '']},
    {name: '', color: 'blue', words: ['', '', '', '']},
    {name: '', color: 'purple', words: ['', '', '', '']}
  ]);
  
  // Puzzle solving states
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [wordStates, setWordStates] = useState<{[key: string]: 'unselected' | 'selected' | 'correct'}>({});
  const [solvedCategories, setSolvedCategories] = useState<string[]>([]);
  const [incorrectGuesses, setIncorrectGuesses] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [message, setMessage] = useState('');
  // State to store shuffled words
  const [shuffledWords, setShuffledWords] = useState<Word[]>([]);

  const fetchGroupData = useCallback(async () => {
    try {
      const [groupRes, puzzlesRes, membersRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/puzzles`),
        fetch(`/api/groups/${groupId}/members`),
      ]);

      if (!groupRes.ok || !puzzlesRes.ok || !membersRes.ok) throw new Error('Failed to fetch data');

      const groupData = await groupRes.json();
      const puzzlesData = await puzzlesRes.json();
      const membersData = await membersRes.json();

      setGroup(groupData);
      setPuzzles(puzzlesData);
      setMembers(membersData);
    } catch {
      setError('Failed to load group data');
    }
  }, [groupId]);

  useEffect(() => { fetchGroupData(); }, [fetchGroupData]);

  // Function to shuffle an array (Fisher-Yates algorithm)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleCategoryInputChange = (catIndex: number, field: 'name' | 'color', value: string) => {
    const newCategories = [...categories];
    newCategories[catIndex][field] = value;
    setCategories(newCategories);
  };

  const handleWordInputChange = (catIndex: number, wordIndex: number, value: string) => {
    const newCategories = [...categories];
    newCategories[catIndex].words[wordIndex] = value;
    setCategories(newCategories);
  };

  const handleSubmitPuzzle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields are filled
    const isValid = categories.every(cat => 
      cat.name.trim() !== '' && cat.words.every(word => word.trim() !== '')
    );
    
    if (!isValid) {
      setError('All category names and words must be filled in');
      return;
    }
    
    try {
      const res = await fetch(`/api/groups/${groupId}/puzzles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty, categories }),
      });
      
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit puzzle');
      
      // Reset form and refresh data
      setDifficulty('medium');
      setCategories([
        {name: '', color: 'yellow', words: ['', '', '', '']},
        {name: '', color: 'green', words: ['', '', '', '']},
        {name: '', color: 'blue', words: ['', '', '', '']},
        {name: '', color: 'purple', words: ['', '', '', '']}
      ]);
      setIsCreatingPuzzle(false);
      fetchGroupData();
      setActiveTab('puzzles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit puzzle');
    }
  };

  const selectPuzzle = (puzzle: Puzzle) => {
    setCurrentPuzzle(puzzle);
    setSelectedWords([]);
    setWordStates({});
    setSolvedCategories([]);
    setIncorrectGuesses(0);
    setIsGameComplete(false);
    setMessage('');
    
    // Initialize all words as unselected
    const initialWordStates: {[key: string]: 'unselected' | 'selected' | 'correct'} = {};
    puzzle.categories.forEach(category => {
      category.words.forEach(word => {
        initialWordStates[word.text] = 'unselected';
      });
    });
    setWordStates(initialWordStates);

    // Shuffle all words from the puzzle initially
    setShuffledWords(shuffleArray(puzzle.categories.flatMap(category => category.words)));
  };

  const toggleWordSelection = (word: string) => {
    // If word is already correct or game is complete, do nothing
    if (wordStates[word] === 'correct' || isGameComplete) return;
    
    // Toggle word selection
    const newSelectedWords = [...selectedWords];
    const newWordStates = {...wordStates};
    
    if (selectedWords.includes(word)) {
      // Deselect word
      const index = newSelectedWords.indexOf(word);
      newSelectedWords.splice(index, 1);
      newWordStates[word] = 'unselected';
    } else {
      // Select word if fewer than 4 words are selected
      if (newSelectedWords.length < 4) {
        newSelectedWords.push(word);
        newWordStates[word] = 'selected';
      }
    }
    
    setSelectedWords(newSelectedWords);
    setWordStates(newWordStates);
    
    // Clear any existing message when selection changes
    setMessage('');
  };

  const checkSelectedWords = () => {
    if (!currentPuzzle || selectedWords.length !== 4) return;
    
    // Find if the 4 selected words belong to the same category
    let correctCategory: Category | null = null;
    
    for (const category of currentPuzzle.categories) {
      const categoryWordTexts = category.words.map(word => word.text);
      const allWordsInCategory = selectedWords.every(word => categoryWordTexts.includes(word));
      
      if (allWordsInCategory) {
        correctCategory = category;
        break;
      }
    }
    
    if (correctCategory) {
      // Mark these words as correct
      const newWordStates = {...wordStates};
      selectedWords.forEach(word => {
        newWordStates[word] = 'correct';
      });
      setWordStates(newWordStates);
      
      // Add category to solved categories
      setSolvedCategories([...solvedCategories, correctCategory.name]);
      
      // Clear selected words
      setSelectedWords([]);
      
      // Set success message
      setMessage(`Correct! You found the "${correctCategory.name}" category.`);
      
      // Reshuffle the remaining words
      if (currentPuzzle) {
        const remainingWords = currentPuzzle.categories
          .flatMap(category => category.words)
          .filter(word => {
            // Not in the just-solved category and not already in a solved category
            const isInCurrentCategory = correctCategory?.words.some(w => w.id === word.id) || false;
            return !isInCurrentCategory && newWordStates[word.text] !== 'correct';
          });
        setShuffledWords(shuffleArray(remainingWords));
      }
      
      // Check if all categories are solved
      if (solvedCategories.length + 1 === currentPuzzle.categories.length) {
        setIsGameComplete(true);
        // Submit solution to API
        submitCompletedPuzzle();
      }
    } else {
      // Incorrect guess
      setIncorrectGuesses(prev => prev + 1);
      setMessage('Incorrect. These words don\'t belong to the same category.');
    }
  };
  
  const submitCompletedPuzzle = async () => {
    if (!currentPuzzle) return;
    
    try {
      const res = await fetch(`/api/groups/${groupId}/puzzles/${currentPuzzle.id}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incorrectGuesses }),
      });
      
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit solution');
      
      const data = await res.json();
      
      // Display completion message with score
      setMessage(`Congratulations! You solved all categories with ${data.score} points.`);
      
      // Refresh group data to update leaderboard
      fetchGroupData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit solution');
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
        {['puzzles', 'create', 'leaderboard'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 font-semibold ${activeTab === tab ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'}`}
          >
            {tab === 'puzzles' ? 'Solve Puzzles' : tab === 'create' ? 'Submit Puzzle' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {activeTab === 'create' && !isCreatingPuzzle && (
        <section>
          <h2 className="text-xl font-bold mb-4">Create a New Puzzle</h2>
          <form onSubmit={handleSubmitPuzzle} className="space-y-4">
            <input
              type="text"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              placeholder="Difficulty"
              className="w-full border border-gray-300 px-4 py-2 rounded"
              required
            />
            {categories.map((cat, catIndex) => (
              <div key={catIndex}>
                <h3 className="text-lg font-semibold mb-2">{cat.name}</h3>
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => handleCategoryInputChange(catIndex, 'name', e.target.value)}
                  placeholder="Category Name"
                  className="w-full border border-gray-300 px-4 py-2 rounded"
                  required
                />
                {cat.words.map((word, wordIndex) => (
                  <input
                    key={`${catIndex}-${wordIndex}`}
                    type="text"
                    value={word}
                    onChange={(e) => handleWordInputChange(catIndex, wordIndex, e.target.value)}
                    placeholder={`Word ${wordIndex + 1}`}
                    className="w-full border border-gray-300 px-4 py-2 rounded"
                    required
                  />
                ))}
              </div>
            ))}
            <button type="submit" className="bg-black text-white px-4 py-2 rounded hover:opacity-90">
              Submit
            </button>
          </form>
        </section>
      )}

      {activeTab === 'puzzles' && (
        <div className="grid md:grid-cols-3 gap-6">
          <aside className="space-y-2">
            <h3 className="text-lg font-semibold">Puzzles</h3>
            {puzzles.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No puzzles yet.</p>
            ) : (
              puzzles.map(puzzle => (
                <button
                  key={puzzle.id}
                  onClick={() => selectPuzzle(puzzle)}
                  className={`block w-full text-left px-4 py-2 rounded hover:bg-gray-100 ${
                    currentPuzzle?.id === puzzle.id ? 'bg-gray-100 border-l-4 border-black' : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <span className={`${getDifficultyColor(puzzle.difficulty)}`}>
                      {puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}
                    </span>
                    {puzzle.attempts.some(a => a.completed) && <span className="text-green-500">✓</span>}
                  </div>
                  <p className="text-xs text-gray-500">by {puzzle.author.name}</p>
                </button>
              ))
            )}
          </aside>

          <section className="md:col-span-2">
            {currentPuzzle ? (
              <div>
                <div className="mb-2 text-sm text-gray-500">
                  <span className={`font-semibold ${getDifficultyColor(currentPuzzle.difficulty)}`}>
                    {currentPuzzle.difficulty.charAt(0).toUpperCase() + currentPuzzle.difficulty.slice(1)}
                  </span> puzzle by {currentPuzzle.author.name}
                </div>
                
                {isGameComplete ? (
                  <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="text-2xl font-bold text-green-800 mb-4">Puzzle Complete!</h3>
                    <p className="text-green-700 mb-4">{message}</p>
                    <p className="text-green-600">
                      Incorrect guesses: {incorrectGuesses}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Solved categories */}
                    {solvedCategories.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold mb-2">Solved Categories:</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {solvedCategories.map((categoryName, idx) => {
                            const category = currentPuzzle.categories.find(c => c.name === categoryName);
                            return (
                              <div key={idx} className={`px-4 py-2 rounded-lg ${getCategoryColorClass(category?.color || 'gray')}`}>
                                <p className="font-bold mb-1">{categoryName}</p>
                                <div className="flex flex-wrap gap-1">
                                  {category?.words.map(word => (
                                    <span key={word.id} className="inline-block px-2 py-1 bg-white bg-opacity-50 rounded">
                                      {word.text}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Message area */}
                    {message && (
                      <div className={`mb-4 p-3 rounded ${message.includes('Correct') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message}
                      </div>
                    )}
                    
                    {/* Remaining words */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-2">Select four words that belong together:</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {shuffledWords
                          .filter(word => wordStates[word.text] !== 'correct')
                          .map(word => (
                            <button
                              key={word.id}
                              onClick={() => toggleWordSelection(word.text)}
                              className={`px-2 py-2 text-center rounded ${
                                wordStates[word.text] === 'selected' 
                                  ? 'bg-blue-100 border-2 border-blue-400 font-bold' 
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              {word.text}
                            </button>
                          ))}
                      </div>
                    </div>
                    
                    {/* Submit button */}
                    <div className="flex justify-center">
                      <button
                        onClick={checkSelectedWords}
                        className="bg-black text-white px-6 py-2 rounded hover:opacity-90 disabled:opacity-50"
                        disabled={selectedWords.length !== 4}
                      >
                        Submit
                      </button>
                    </div>
                    
                    {/* Incorrect guesses counter */}
                    <div className="mt-4 text-center text-sm text-gray-500">
                      Incorrect guesses: {incorrectGuesses}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select a puzzle to solve.</p>
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
