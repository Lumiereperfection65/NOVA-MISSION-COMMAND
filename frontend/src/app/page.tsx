"use client";
import React, { useEffect, useState } from 'react';
import Header, { type AppTab } from '@/components/layout/Header';
import ComingSoon from '@/components/layout/ComingSoon';
import HomePage, { type Activity } from '@/components/home/HomePage';
import SimulationPage from '@/components/simulation/SimulationPage';
import MissionBuilder from '@/components/mission-builder/MissionBuilder';
import SpaceBackdrop from '@/components/visuals/SpaceBackdrop';
import { API_BASE_URL } from '@/lib/mission/api';
import type { SimulationResult } from '@/lib/mission/types';

const MINUTE = 60_000;

function initialActivities(): Activity[] {
  const now = Date.now();
  return [
    { id: 'seed-1', label: 'Simulation réussie : Mission Arès-1', at: now - 12 * MINUTE, tone: 'blue' },
    { id: 'seed-2', label: 'Nouvelle contribution : moteur de simulation', at: now - 32 * MINUTE, tone: 'green' },
    { id: 'seed-3', label: "Message de l'équipe GO", at: now - 60 * MINUTE, tone: 'orange' },
  ];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);
  const [lastMissionName, setLastMissionName] = useState('');
  const [systemsOk, setSystemsOk] = useState<boolean | null>(null);

  // Health check of the backend for the "Systèmes" card.
  useEffect(() => {
    fetch(`${API_BASE_URL}/`)
      .then(r => setSystemsOk(r.ok))
      .catch(() => setSystemsOk(false));
  }, []);

  const navigate = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const recordSimulation = (result: SimulationResult, name: string) => {
    setLastResult(result);
    setLastMissionName(name);
    const ok = result.mission_status === 'SUCCESS';
    setActivities(list => [
      { id: `sim-${Date.now()}`, label: `Simulation ${ok ? 'réussie' : result.mission_status === 'INVALID' ? 'invalide' : 'échouée'} : ${name}`, at: Date.now(), tone: ok ? 'blue' : 'red' },
      ...list,
    ]);
  };

  return (
    <div className="relative isolate min-h-screen">
      <SpaceBackdrop />
      <Header active={activeTab} onNavigate={navigate} />

      <main>
        {activeTab === 'home' && (
          <HomePage
            onNavigate={navigate}
            activities={activities}
            activeMissions={3}
            systemsOk={systemsOk}
            lastResult={lastResult}
            lastMissionName={lastMissionName}
          />
        )}

        {activeTab === 'missions' && (
          <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-8 sm:py-10 pb-28 lg:pb-12">
            <MissionBuilder onLaunched={recordSimulation} />
          </div>
        )}

        {activeTab === 'simulation' && (
          <SimulationPage
            lastResult={lastResult}
            lastMissionName={lastMissionName}
            onOpenBuilder={() => navigate('missions')}
            onSimulated={recordSimulation}
          />
        )}

        {activeTab === 'team' && (
          <ComingSoon
            title="Équipe"
            description="Nova Tech Africa — Pointe-Noire, République du Congo. L'espace équipe arrive bientôt."
            onBack={() => navigate('home')}
          />
        )}

        {activeTab === 'resources' && (
          <ComingSoon
            title="Ressources"
            description="Guides, données de mission et documentation de l'API seront disponibles ici."
            onBack={() => navigate('home')}
          />
        )}
      </main>
    </div>
  );
}
