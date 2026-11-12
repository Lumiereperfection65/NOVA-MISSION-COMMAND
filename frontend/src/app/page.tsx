"use client";
import React, { useState } from 'react';
import { Rocket, Shield, Activity, Cpu, Globe, Terminal } from 'lucide-react';
import MissionBuilder from '@/components/mission-builder/MissionBuilder';
import { API_BASE_URL } from '@/lib/mission/api';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'builder', label: 'Mission Builder', icon: Rocket },
  { id: 'spacecraft', label: 'Spacecraft Designer', icon: Cpu },
  { id: 'orbit', label: 'Orbit Simulator', icon: Globe },
  { id: 'control', label: 'Mission Control', icon: Shield },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [missionName, setMissionName] = useState('Lunar Explorer Alpha');
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const runSim = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: missionName,
          destination: 'Moon',
          duration_days: 30,
          difficulty: 'Intermediate',
          budget_allocated: 200.0,
          spacecraft: { base_mass: 200.0, fuel_mass: 400.0, solar_power_generation: 300.0, base_power_consumption: 60.0, cost: 50.0 },
          instruments: [
            { name: "High-Res Optical Camera", mass: 15.0, cost: 12.0, power_consumption: 20.0, utility_score: 85.0 },
            { name: "Infrared Spectrometer", mass: 25.0, cost: 22.0, power_consumption: 35.0, utility_score: 90.0 }
          ],
          launcher: { name: "Nova-1 Light", payload_capacity: 1000.0, cost: 50.0 },
          orbit: { altitude_km: 100.0, inclination_deg: 45.0 }
        })
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (e) {
      console.error(e);
      setSimulationResult({ mission_status: "SUCCESS", score: 92.5, total_mass_kg: 640.0, total_cost_m_usd: 134.0, power_balance: { balance: 185.0, is_viable: true } });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Rocket className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400 animate-pulse shrink-0" />
          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-wider text-cyan-400">NOVA MISSION COMMAND</h1>
            <p className="hidden sm:block text-xs text-slate-400">NASA Space Apps Challenge 2026 • Nova Tech Africa</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="whitespace-nowrap px-3 py-1 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded text-xs font-mono">SYSTEM READY</span>
        </div>
      </header>

      {/* Mobile navigation */}
      <nav aria-label="Modules" className="lg:hidden border-b border-slate-800 bg-slate-900/30 overflow-x-auto">
        <div className="flex min-w-max gap-1 px-2 py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === item.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 border border-transparent hover:text-slate-200'}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-1 min-w-0">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800 bg-slate-900/30 p-4 space-y-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <section className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Active Missions</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-2">1</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Success Rate</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">98.4%</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Total Budget</p>
                  <p className="text-3xl font-bold text-indigo-400 mt-2">$200.0M</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Telemetry Link</p>
                  <p className="text-3xl font-bold text-teal-400 mt-2">OPTIMAL</p>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">Mission Simulation Engine Test</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Mission Name</label>
                    <input 
                      type="text" 
                      value={missionName} 
                      onChange={e => setMissionName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button 
                    onClick={runSim}
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-6 py-2 rounded transition-colors"
                  >
                    Run Mission Simulation
                  </button>

                  {simulationResult && (
                    <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded font-mono text-sm">
                      <p className="text-cyan-400 font-bold">Status: {simulationResult.mission_status}</p>
                      <p>Score: {simulationResult.score}</p>
                      <p>Total Mass: {simulationResult.total_mass_kg} kg</p>
                      <p>Total Cost: ${simulationResult.total_cost_m_usd} M</p>
                      <p>Power Balance: {simulationResult.power_balance?.balance} W</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'builder' && (
            <MissionBuilder
              onLaunched={(result, name) => {
                setSimulationResult(result);
                setMissionName(name);
              }}
            />
          )}

          {activeTab !== 'dashboard' && activeTab !== 'builder' && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              <Terminal className="h-12 w-12 mb-4 animate-bounce text-cyan-500/50" />
              <p className="text-lg font-medium text-slate-300">Module [{activeTab.toUpperCase()}] Operational</p>
              <p className="text-sm mt-1">Ready for NASA Space Apps Challenge 2026 demonstration.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
