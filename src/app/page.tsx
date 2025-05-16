'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [createName, setCreateName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode, memberName: joinName }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to join group');
      }
      const data = await res.json();
      router.push(`/groups/${data.groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName, memberName: createName }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create group');
      }
      const data = await res.json();
      router.push(`/groups/${data.groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  return (
    <main className="min-h-screen bg-white text-black px-4 py-12 font-mono">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 leading-tight">Share & Solve Cryptic Clues Together</h1>
        <p className="text-gray-500 mb-8">Create or join a group of friends to swap cryptic crossword clues and compete.</p>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-6 border border-red-200">
            {error}
          </div>
        )}

        <div className="flex space-x-6 mb-6 text-sm font-semibold">
          <button
            className={`${!showCreateForm ? 'text-black underline' : 'text-gray-400'} transition`}
            onClick={() => setShowCreateForm(false)}
          >
            Join Group
          </button>
          <button
            className={`${showCreateForm ? 'text-black underline' : 'text-gray-400'} transition`}
            onClick={() => setShowCreateForm(true)}
          >
            Create Group
          </button>
        </div>

        {!showCreateForm ? (
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-300 px-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Group code"
              className="w-full border border-gray-300 px-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded hover:opacity-90 transition"
            >
              Join
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-300 px-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full border border-gray-300 px-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded hover:opacity-90 transition"
            >
              Create
            </button>
          </form>
        )}

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">How It Works</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><strong>1. </strong>Create or join a group with a short code</li>
            <li><strong>2. </strong>Share cryptic clues and solutions</li>
            <li><strong>3. </strong>Track solves and see who’s on top</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
